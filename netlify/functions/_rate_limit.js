const crypto = require("crypto");
const { getSupabaseConfig } = require("./_auth");

function getClientAddress(event) {
  return String(
    event.headers["x-nf-client-connection-ip"] ||
    event.headers["x-forwarded-for"] ||
    event.headers["client-ip"] ||
    "unknown"
  ).split(",")[0].trim();
}

async function checkRateLimit(event, scope, limit, windowSeconds = 60, organizationId = "") {
  const windowId = Math.floor(Date.now() / (windowSeconds * 1000));
  const addressHash = crypto.createHash("sha256").update(getClientAddress(event)).digest("hex").slice(0, 24);
  const organizationHash = crypto.createHash("sha256").update(String(organizationId || "public")).digest("hex").slice(0, 16);
  const key = `rate-${organizationHash}-${scope}-${addressHash}`;
  const expiresAt = new Date((windowId + 1) * windowSeconds * 1000).toISOString();
  const { url, serviceKey } = getSupabaseConfig();
  if (!url || !serviceKey) throw new Error("Supabase rate limiting needs the service role key in Netlify.");

  const response = await fetch(`${url}/rest/v1/rpc/consume_server_rate_limit`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ p_rate_key: key, p_limit: limit, p_expires_at: expiresAt })
  });
  if (!response.ok) throw new Error("Supabase rate-limit migration is not available.");
  const rows = await response.json();
  const current = Array.isArray(rows) ? rows[0] : rows;
  return {
    allowed: Boolean(current?.allowed),
    retryAfter: windowSeconds
  };
}

function rateLimitResponse(retryAfter = 60) {
  return {
    statusCode: 429,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Retry-After": String(retryAfter)
    },
    body: JSON.stringify({ error: "Too many requests. Wait a moment and try again." })
  };
}

module.exports = { checkRateLimit, rateLimitResponse };
