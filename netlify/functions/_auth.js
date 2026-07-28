function jsonHeaders(extra = {}) {
  return {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    ...extra
  };
}

function getBearerToken(event) {
  const authHeader = event.headers.authorization || event.headers.Authorization || "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
}

function getSupabaseConfig() {
  return {
    url: process.env.SUPABASE_URL || "",
    publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || "",
    serviceKey:
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_KEY ||
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_DEFAULT_SECRET_KEY ||
      ""
  };
}

function decodeJwtIssuedAt(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return Number(payload.iat || 0) * 1000;
  } catch {
    return 0;
  }
}

async function getRequestContext(event) {
  const token = getBearerToken(event);
  if (!token) return null;

  const { url, publishableKey, serviceKey } = getSupabaseConfig();
  const apiKey = serviceKey || publishableKey;
  if (!url || !apiKey) return null;

  try {
    const userResponse = await fetch(`${url}/auth/v1/user`, {
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${token}`
      }
    });
    if (!userResponse.ok) return null;
    const user = await userResponse.json();

    const profileResponse = await fetch(
      `${url}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=id,organization_id,role,is_active,sessions_valid_after,organizations(access_paused)`,
      {
        headers: {
          apikey: apiKey,
          Authorization: `Bearer ${serviceKey || token}`,
          Accept: "application/vnd.pgrst.object+json"
        }
      }
    );
    if (!profileResponse.ok) return null;
    const profile = await profileResponse.json();
    const organization = Array.isArray(profile.organizations) ? profile.organizations[0] : profile.organizations;
    const validAfter = new Date(profile.sessions_valid_after || 0).getTime();
    const issuedAt = decodeJwtIssuedAt(token);

    if (profile.is_active === false || organization?.access_paused === true) return null;
    if (Number.isFinite(validAfter) && validAfter > 0 && issuedAt < validAfter) return null;

    return { token, user, profile };
  } catch {
    return null;
  }
}

async function validateRequest(event) {
  return Boolean(await getRequestContext(event));
}

module.exports = {
  getBearerToken,
  getRequestContext,
  getSupabaseConfig,
  jsonHeaders,
  validateRequest
};

