const { getRequestContext } = require("./_auth");
const { checkRateLimit, rateLimitResponse } = require("./_rate_limit");
const { createServerStateStore } = require("./_server_state");

const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store"
};

exports.handler = async (event, context) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers
    };
  }

  const requestContext = await getRequestContext(event);
  if (!requestContext) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: "Unauthorized" })
    };
  }
  if (requestContext.profile.role !== "admin") {
    return { statusCode: 403, headers, body: JSON.stringify({ error: "Only admins can access organization-wide legacy state." }) };
  }

  const rate = await checkRateLimit(event, "app-state", event.httpMethod === "GET" ? 120 : 30, 60, requestContext.profile.organization_id);
  if (!rate.allowed) return rateLimitResponse(rate.retryAfter);

  const store = createServerStateStore("app-state", requestContext.profile.organization_id);

  if (event.httpMethod === "GET") {
    const state = await store.get("app-state", { type: "json" });
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(state || {})
    };
  }

  if (event.httpMethod === "POST") {
    if (Buffer.byteLength(event.body || "", "utf8") > 2 * 1024 * 1024) {
      return { statusCode: 413, headers, body: JSON.stringify({ error: "App state is too large." }) };
    }
    let state;
    try {
      state = JSON.parse(event.body || "{}");
    } catch {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON." }) };
    }
    if (!state || Array.isArray(state) || typeof state !== "object") {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "App state must be an object." }) };
    }
    await store.setJSON("app-state", state);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true })
    };
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: "Method not allowed" })
  };
};
