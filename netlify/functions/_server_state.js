const { getSupabaseConfig } = require("./_auth");

function createServerStateStore(namespace, organizationId) {
  const safeNamespace = String(namespace || "").trim();
  const safeOrganizationId = String(organizationId || "").trim();
  if (!safeNamespace || !safeOrganizationId) {
    throw new Error("Supabase server state requires a namespace and organization.");
  }

  return {
    async get(key, options = {}) {
      const { url, serviceKey } = requireServiceConfig();
      const query = new URL(`${url}/rest/v1/server_state`);
      query.searchParams.set("organization_id", `eq.${safeOrganizationId}`);
      query.searchParams.set("namespace", `eq.${safeNamespace}`);
      query.searchParams.set("state_key", `eq.${String(key || "")}`);
      query.searchParams.set("select", "value");
      query.searchParams.set("limit", "1");

      const response = await fetch(query, { headers: serviceHeaders(serviceKey) });
      if (!response.ok) throw new Error(await responseMessage(response, "Supabase server state could not be read."));
      const rows = await response.json();
      const value = rows?.[0]?.value ?? null;
      return options.type && options.type !== "json" ? JSON.stringify(value) : value;
    },

    async setJSON(key, value) {
      const { url, serviceKey } = requireServiceConfig();
      const query = new URL(`${url}/rest/v1/server_state`);
      query.searchParams.set("on_conflict", "organization_id,namespace,state_key");
      const response = await fetch(query, {
        method: "POST",
        headers: serviceHeaders(serviceKey, { Prefer: "resolution=merge-duplicates,return=minimal" }),
        body: JSON.stringify({
          organization_id: safeOrganizationId,
          namespace: safeNamespace,
          state_key: String(key || ""),
          value: value ?? {},
          updated_at: new Date().toISOString()
        })
      });
      if (!response.ok) throw new Error(await responseMessage(response, "Supabase server state could not be saved."));
    }
  };
}

function requireServiceConfig() {
  const { url, serviceKey } = getSupabaseConfig();
  if (!url || !serviceKey) throw new Error("Supabase server state needs the service role key in Netlify.");
  return { url, serviceKey };
}

function serviceHeaders(serviceKey, extra = {}) {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
    ...extra
  };
}

async function responseMessage(response, fallback) {
  try {
    const body = await response.json();
    return body.message || body.error || fallback;
  } catch {
    return fallback;
  }
}

module.exports = { createServerStateStore };
