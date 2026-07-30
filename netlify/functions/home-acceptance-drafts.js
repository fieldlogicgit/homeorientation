const { getRequestContext, getSupabaseConfig } = require("./_auth");
const { checkRateLimit, rateLimitResponse } = require("./_rate_limit");
const { createServerStateStore } = require("./_server_state");

const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store"
};
const namespace = "home-acceptance-drafts";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

exports.handler = async (event) => {
  try {
    const context = await getRequestContext(event);
    if (!context) return response(401, { error: "Unauthorized" });
    const organizationId = context.profile.organization_id;
    const rate = await checkRateLimit(event, "home-acceptance-drafts", event.httpMethod === "GET" ? 120 : 60, 60, organizationId);
    if (!rate.allowed) return rateLimitResponse(rate.retryAfter);

    if (event.httpMethod === "GET") {
      return response(200, { drafts: await listDrafts(context) });
    }

    if (event.httpMethod === "POST") {
      if (Buffer.byteLength(event.body || "", "utf8") > 2 * 1024 * 1024) {
        return response(413, { error: "The signing draft is too large." });
      }
      const body = JSON.parse(event.body || "{}");
      const siteId = String(body.siteId || "").trim();
      if (!uuid.test(siteId)) return response(400, { error: "A valid home is required." });
      if (!await signedInUserCanAccessSite(context, siteId)) {
        return response(403, { error: "This home is not available to this login." });
      }
      if (!body.draft || Array.isArray(body.draft) || typeof body.draft !== "object") {
        return response(400, { error: "A valid signing draft is required." });
      }
      const store = createServerStateStore(namespace, organizationId);
      await store.setJSON(siteId, body.draft);
      return response(200, { ok: true });
    }

    return response(405, { error: "Method not allowed" });
  } catch (error) {
    return response(500, { error: error.message || "Signing draft could not be saved." });
  }
};

async function listDrafts(context) {
  const organizationId = context.profile.organization_id;
  const { url, serviceKey } = getSupabaseConfig();
  if (!url || !serviceKey) throw new Error("Signing drafts need the Supabase service role key.");
  const query = new URL(`${url}/rest/v1/server_state`);
  query.searchParams.set("organization_id", `eq.${organizationId}`);
  query.searchParams.set("namespace", `eq.${namespace}`);
  query.searchParams.set("select", "state_key,value");
  const result = await fetch(query, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
  });
  if (!result.ok) throw new Error("Signing drafts could not be loaded.");
  const rows = await result.json();
  const accessibleSiteIds = await getAccessibleSiteIds(context);
  return Object.fromEntries((rows || [])
    .filter((row) => accessibleSiteIds.has(row.state_key))
    .map((row) => [row.state_key, row.value || {}]));
}

async function getAccessibleSiteIds(context) {
  const { url, publishableKey } = getSupabaseConfig();
  if (!url || !publishableKey) return new Set();
  const query = new URL(`${url}/rest/v1/sites`);
  query.searchParams.set("select", "id");
  const result = await fetch(query, {
    headers: { apikey: publishableKey, Authorization: `Bearer ${context.token}` }
  });
  if (!result.ok) return new Set();
  const rows = await result.json();
  return new Set((rows || []).map((row) => row.id));
}

async function signedInUserCanAccessSite(context, siteId) {
  return (await getAccessibleSiteIds(context)).has(siteId);
}

function response(statusCode, body) {
  return { statusCode, headers, body: JSON.stringify(body) };
}
