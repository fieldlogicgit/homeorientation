const { getSupabaseConfig } = require("./_auth");

function isAdmin(context) {
  return context?.profile?.role === "admin";
}

async function getUserAccessibleSiteIds(context, requestedSiteIds) {
  const ids = [...new Set((requestedSiteIds || []).map(String).filter(Boolean))];
  if (!context || !ids.length) return [];
  const { url, publishableKey } = getSupabaseConfig();
  if (!url || !publishableKey) return [];

  const query = new URL(`${url}/rest/v1/sites`);
  query.searchParams.set("organization_id", `eq.${context.profile.organization_id}`);
  query.searchParams.set("id", `in.(${ids.join(",")})`);
  query.searchParams.set("select", "id");
  const response = await fetch(query, {
    headers: { apikey: publishableKey, Authorization: `Bearer ${context.token}` }
  });
  if (!response.ok) return [];
  const rows = await response.json();
  return (rows || []).map((row) => row.id);
}

async function getOrganizationPunchItem(organizationId, itemId) {
  if (!organizationId || !itemId) return null;
  const { url, serviceKey } = getSupabaseConfig();
  if (!url || !serviceKey) return null;
  const query = new URL(`${url}/rest/v1/punch_items`);
  query.searchParams.set("organization_id", `eq.${organizationId}`);
  query.searchParams.set("id", `eq.${itemId}`);
  query.searchParams.set("select", "id,site_id,trade");
  query.searchParams.set("limit", "1");
  const response = await fetch(query, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
  });
  if (!response.ok) return null;
  const rows = await response.json();
  return rows?.[0] || null;
}

module.exports = {
  getOrganizationPunchItem,
  getUserAccessibleSiteIds,
  isAdmin
};
