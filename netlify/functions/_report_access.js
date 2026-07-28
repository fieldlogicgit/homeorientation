const crypto = require("crypto");
const { getSupabaseConfig } = require("./_auth");

const reportAccessDays = 90;
const legacyAccessDays = 14;
const shortCodeLength = 12;

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

function createAccessToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function createShortReportCode(token, secret = "") {
  const signingSecret = secret || getSupabaseConfig().serviceKey;
  if (!token || !signingSecret) throw new Error("Short report links need the Supabase service role key in Netlify.");
  return crypto
    .createHmac("sha256", signingSecret)
    .update(`punchlogic-report-link:${token}`)
    .digest("base64url")
    .slice(0, shortCodeLength);
}

function createAccessBundle() {
  const expiresAt = new Date(Date.now() + reportAccessDays * 86400000).toISOString();
  return {
    read: createAccessToken(),
    update: createAccessToken(),
    expiresAt
  };
}

function normalizeAccessBundle(value = {}) {
  const expiresAt = new Date(value.expiresAt || 0);
  if (!value.read || !value.update || !Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
    return createAccessBundle();
  }
  return {
    read: String(value.read),
    update: String(value.update),
    expiresAt: expiresAt.toISOString()
  };
}

async function registerReportTokens({ organizationId, reportId, reportKind, tradeName = null, access, createdBy = null, legacyToken = "" }) {
  const bundle = normalizeAccessBundle(access);
  await insertTokens([
    tokenRow({ organizationId, reportId, reportKind, tradeName, permission: "read", token: bundle.read, expiresAt: bundle.expiresAt, createdBy }),
    tokenRow({ organizationId, reportId, reportKind, tradeName, permission: "update", token: bundle.update, expiresAt: bundle.expiresAt, createdBy })
  ]);

  if (legacyToken) {
    await insertTokens([
      tokenRow({
        organizationId,
        reportId,
        reportKind,
        tradeName,
        permission: "update",
        token: legacyToken,
        expiresAt: new Date(Date.now() + legacyAccessDays * 86400000).toISOString(),
        createdBy
      })
    ]);
  }
  return bundle;
}

function tokenRow({ organizationId, reportId, reportKind, tradeName, permission, token, expiresAt, createdBy }) {
  return {
    organization_id: organizationId,
    report_id: reportId,
    report_kind: reportKind,
    trade_name: tradeName || null,
    permission,
    token_hash: hashToken(token),
    expires_at: expiresAt,
    created_by: createdBy || null
  };
}

async function insertTokens(rows) {
  const { url, serviceKey } = getSupabaseConfig();
  if (!url || !serviceKey) throw new Error("Report security needs the Supabase service role key in Netlify.");
  const response = await fetch(`${url}/rest/v1/report_access_tokens?on_conflict=token_hash`, {
    method: "POST",
    headers: serviceHeaders({ Prefer: "resolution=ignore-duplicates,return=minimal" }),
    body: JSON.stringify(rows)
  });
  if (!response.ok) throw new Error(await responseMessage(response, "Report access migration is not available."));
}

async function upsertShortReportToken(row) {
  const { url, serviceKey } = getSupabaseConfig();
  if (!url || !serviceKey) throw new Error("Short report links need the Supabase service role key in Netlify.");
  const response = await fetch(`${url}/rest/v1/report_access_tokens?on_conflict=token_hash`, {
    method: "POST",
    headers: serviceHeaders({ Prefer: "resolution=merge-duplicates,return=minimal" }),
    body: JSON.stringify({ ...row, revoked_at: null })
  });
  if (!response.ok) throw new Error(await responseMessage(response, "Short report link access could not be activated."));
}

async function validateReportToken({ token, reportId, reportKind, requireUpdate = false }) {
  if (!token || !reportId || !reportKind) return null;
  const { url, serviceKey } = getSupabaseConfig();
  if (!url || !serviceKey) return null;

  const query = new URL(`${url}/rest/v1/report_access_tokens`);
  query.searchParams.set("token_hash", `eq.${hashToken(token)}`);
  query.searchParams.set("report_id", `eq.${reportId}`);
  query.searchParams.set("report_kind", `eq.${reportKind}`);
  query.searchParams.set("revoked_at", "is.null");
  query.searchParams.set("expires_at", `gt.${new Date().toISOString()}`);
  query.searchParams.set("select", "id,organization_id,report_id,report_kind,trade_name,permission,expires_at");

  const response = await fetch(query, { headers: serviceHeaders() });
  if (!response.ok) return null;
  const rows = await response.json();
  const access = rows?.[0] || null;
  if (!access || (requireUpdate && access.permission !== "update")) return null;

  fetch(`${url}/rest/v1/report_access_tokens?id=eq.${encodeURIComponent(access.id)}`, {
    method: "PATCH",
    headers: serviceHeaders({ Prefer: "return=minimal" }),
    body: JSON.stringify({ last_used_at: new Date().toISOString() })
  }).catch(() => {});
  return access;
}

async function registerShortReportLink({ token, access, createdBy = null }) {
  if (!token || !access?.organization_id || !access?.report_id || !access?.report_kind) {
    throw new Error("The report link could not be shortened.");
  }

  const code = createShortReportCode(token);
  await upsertShortReportToken(tokenRow({
    organizationId: access.organization_id,
    reportId: access.report_id,
    reportKind: access.report_kind,
    tradeName: access.trade_name,
    permission: access.permission,
    token: code,
    expiresAt: access.expires_at,
    createdBy
  }));

  const { url, serviceKey } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/report_short_links?on_conflict=code_hash`, {
    method: "POST",
    headers: serviceHeaders({ Prefer: "resolution=merge-duplicates,return=minimal" }),
    body: JSON.stringify({
      code_hash: hashToken(code),
      organization_id: access.organization_id,
      report_id: access.report_id,
      report_kind: access.report_kind,
      trade_name: access.trade_name || null,
      permission: access.permission,
      expires_at: access.expires_at,
      revoked_at: null,
      created_by: createdBy || null
    })
  });
  if (!response.ok) throw new Error(await responseMessage(response, "Short report links are not available yet."));
  return code;
}

async function resolveShortReportLink(code) {
  if (!code) return null;
  const { url, serviceKey } = getSupabaseConfig();
  if (!url || !serviceKey) return null;

  const query = new URL(`${url}/rest/v1/report_short_links`);
  query.searchParams.set("code_hash", `eq.${hashToken(code)}`);
  query.searchParams.set("revoked_at", "is.null");
  query.searchParams.set("expires_at", `gt.${new Date().toISOString()}`);
  query.searchParams.set("select", "id,organization_id,report_id,report_kind,trade_name,permission,expires_at");

  const response = await fetch(query, { headers: serviceHeaders() });
  if (!response.ok) return null;
  const rows = await response.json();
  const link = rows?.[0] || null;
  if (!link) return null;

  const access = await validateReportToken({
    token: code,
    reportId: link.report_id,
    reportKind: link.report_kind,
    requireUpdate: link.permission === "update"
  });
  if (!access || access.organization_id !== link.organization_id || access.permission !== link.permission) return null;

  fetch(`${url}/rest/v1/report_short_links?id=eq.${encodeURIComponent(link.id)}`, {
    method: "PATCH",
    headers: serviceHeaders({ Prefer: "return=minimal" }),
    body: JSON.stringify({ last_used_at: new Date().toISOString() })
  }).catch(() => {});
  return link;
}

async function revokeReportToken({ token, organizationId }) {
  const { url, serviceKey } = getSupabaseConfig();
  if (!url || !serviceKey || !token || !organizationId) return false;
  const response = await fetch(
    `${url}/rest/v1/report_access_tokens?token_hash=eq.${hashToken(token)}&organization_id=eq.${encodeURIComponent(organizationId)}&revoked_at=is.null`,
    {
      method: "PATCH",
      headers: serviceHeaders({ Prefer: "return=representation" }),
      body: JSON.stringify({ revoked_at: new Date().toISOString() })
    }
  );
  if (!response.ok) throw new Error(await responseMessage(response, "Report link could not be revoked."));
  const rows = await response.json();
  await revokeShortLinksByHash(hashToken(token), organizationId).catch(() => {});
  return Boolean(rows?.length);
}

async function revokeReportScope({ organizationId, reportId, reportKind, tradeName = null }) {
  const { url, serviceKey } = getSupabaseConfig();
  if (!url || !serviceKey || !organizationId || !reportId || !reportKind) return 0;

  const query = new URL(`${url}/rest/v1/report_access_tokens`);
  query.searchParams.set("organization_id", `eq.${organizationId}`);
  query.searchParams.set("report_id", `eq.${reportId}`);
  query.searchParams.set("report_kind", `eq.${reportKind}`);
  query.searchParams.set("revoked_at", "is.null");
  if (tradeName) query.searchParams.set("trade_name", `eq.${tradeName}`);
  else if (reportKind === "site") query.searchParams.set("trade_name", "is.null");

  const response = await fetch(query, {
    method: "PATCH",
    headers: serviceHeaders({ Prefer: "return=representation" }),
    body: JSON.stringify({ revoked_at: new Date().toISOString() })
  });
  if (!response.ok) throw new Error(await responseMessage(response, "Report links could not be revoked."));
  const rows = await response.json();
  await revokeShortLinkScope({ organizationId, reportId, reportKind, tradeName }).catch(() => {});
  return rows?.length || 0;
}

async function revokeShortLinksByHash(codeHash, organizationId) {
  const { url, serviceKey } = getSupabaseConfig();
  if (!url || !serviceKey) return;
  await fetch(
    `${url}/rest/v1/report_short_links?code_hash=eq.${codeHash}&organization_id=eq.${encodeURIComponent(organizationId)}&revoked_at=is.null`,
    {
      method: "PATCH",
      headers: serviceHeaders({ Prefer: "return=minimal" }),
      body: JSON.stringify({ revoked_at: new Date().toISOString() })
    }
  );
}

async function revokeShortLinkScope({ organizationId, reportId, reportKind, tradeName = null }) {
  const { url, serviceKey } = getSupabaseConfig();
  if (!url || !serviceKey) return;
  const query = new URL(`${url}/rest/v1/report_short_links`);
  query.searchParams.set("organization_id", `eq.${organizationId}`);
  query.searchParams.set("report_id", `eq.${reportId}`);
  query.searchParams.set("report_kind", `eq.${reportKind}`);
  query.searchParams.set("revoked_at", "is.null");
  if (tradeName) query.searchParams.set("trade_name", `eq.${tradeName}`);
  else if (reportKind === "site") query.searchParams.set("trade_name", "is.null");
  await fetch(query, {
    method: "PATCH",
    headers: serviceHeaders({ Prefer: "return=minimal" }),
    body: JSON.stringify({ revoked_at: new Date().toISOString() })
  });
}

function serviceHeaders(extra = {}) {
  const { serviceKey } = getSupabaseConfig();
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

module.exports = {
  createAccessBundle,
  createShortReportCode,
  normalizeAccessBundle,
  registerReportTokens,
  registerShortReportLink,
  resolveShortReportLink,
  revokeReportScope,
  revokeReportToken,
  validateReportToken
};
