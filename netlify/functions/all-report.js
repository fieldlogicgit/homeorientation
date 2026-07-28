const crypto = require("crypto");
const { getRequestContext } = require("./_auth");
const { getOrganizationPunchItem, getUserAccessibleSiteIds, isAdmin } = require("./_authorization");
const { uploadPhotoToSupabaseStorage } = require("./_photos");
const { applyPunchItemPatch, upsertItemPhoto } = require("./_offline_mutations");
const { checkRateLimit, rateLimitResponse } = require("./_rate_limit");
const { registerReportTokens, revokeReportScope, revokeReportToken, validateReportToken } = require("./_report_access");
const { createServerStateStore } = require("./_server_state");

const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store"
};
const allOpenReportId = "all-open-items";
const projectOpenReportPrefix = "project-open-items:";

exports.handler = async (event) => {
  if (event.httpMethod === "GET") {
    const tradeKey = event.queryStringParameters?.trade;
    const reportId = normalizeAllReportId(event.queryStringParameters?.id);
    if (!reportId) return responseError(400, "Invalid report id");
    const access = await validateReportToken({
      token: event.queryStringParameters?.access || tradeKey,
      reportId,
      reportKind: tradeKey ? "all_trade" : "all_items"
    });
    if (!access) return responseError(403, "This report link is invalid, expired, or revoked");
    const rate = await checkRateLimit(event, "all-report-read", 120, 60, access.organization_id);
    if (!rate.allowed) return rateLimitResponse(rate.retryAfter);
    const tradeName = access.trade_name || "";
    const reportStore = createServerStateStore("shared-reports", access.organization_id);
    const report = await reportStore.get(getAllReportStoreKey(reportId), { type: "json" });
    const organizationId = access.organization_id;
    if (!report) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "Report not found" })
      };
    }

    const allowedSiteIds = getReportSiteIds(report);

    if (tradeKey) {
      const trade = access.trade_name || report.tradeKeys?.[tradeKey] || tradeName;
      if (!trade) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: "Crew report not found" })
        };
      }

      report.trade = trade;
      report.issues = await getCurrentAllTradeIssues(trade, organizationId, allowedSiteIds) || (report.issues || []).filter((issue) => issue.trade === trade && !issue.completed);
    } else {
      report.issues = await getCurrentAllIssues(organizationId, allowedSiteIds) || (report.issues || []).filter((issue) => !issue.completed);
    }
    report.accessPermission = access.permission;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(report)
    };
  }

  if (event.httpMethod === "POST") {
    const request = JSON.parse(event.body || "{}");

    if (request.action === "revokeReportAccess") {
      const context = await getRequestContext(event);
      if (!context) return responseError(401, "Unauthorized");
      const reportId = normalizeAllReportId(request.reportId);
      if (!reportId) return responseError(400, "Invalid report id");
      if (!await canManageAllReport(context, reportId)) return responseError(403, "You cannot revoke this report");
      let revokedCount = 0;
      if (["all_trade", "all_items"].includes(request.reportKind)) {
        revokedCount += await revokeReportScope({
          organizationId: context.profile.organization_id,
          reportId,
          reportKind: request.reportKind,
          tradeName: request.reportKind === "all_trade" ? request.tradeName : null
        });
      }
      for (const token of request.tokens || []) {
        if (await revokeReportToken({ token, organizationId: context.profile.organization_id })) revokedCount += 1;
      }
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, revokedCount }) };
    }

    if (request.action === "setTradeCompleted") {
      const authorized = await authorizeAllReportUpdate(request, event);
      if (authorized.response) return authorized.response;
      return setTradeCompleted(request, authorized.store);
    }

    if (request.action === "updateIssueNote") {
      const authorized = await authorizeAllReportUpdate(request, event);
      if (authorized.response) return authorized.response;
      return updateIssueNote(request, authorized.store);
    }

    if (request.action === "addCompletionPhoto") {
      const authorized = await authorizeAllReportUpdate(request, event, true);
      if (authorized.response) return authorized.response;
      return addCompletionPhoto(request, authorized.store);
    }

    const context = await getRequestContext(event);
    if (!context) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Unauthorized" })
      };
    }

    if (getOrganizationId(request) !== context.profile.organization_id) return responseError(403, "Report organization does not match this login");
    const reportId = normalizeAllReportId(request.id);
    if (!reportId) return responseError(400, "Invalid report id");
    const scopedProjectId = getProjectIdFromReportId(reportId);
    if (scopedProjectId && String(request.projectId || "") !== scopedProjectId) return responseError(403, "Report project scope does not match");
    const requestedSiteIds = [...new Set([...(request.siteIds || []), ...(request.issues || []).map((issue) => issue.homesiteId)].map(String).filter(Boolean))];
    const accessibleSiteIds = await getUserAccessibleSiteIds(context, requestedSiteIds);
    if (accessibleSiteIds.length !== requestedSiteIds.length) return responseError(403, "This report includes a site that is not assigned to this login");
    if (isUuid(scopedProjectId) && !await projectContainsSites(context.profile.organization_id, scopedProjectId, requestedSiteIds)) {
      return responseError(403, "This report includes a site outside the selected project");
    }
    const access = await registerAllReportAccess(request, context);
    const reportStore = createServerStateStore("shared-reports", context.profile.organization_id);
    const storedReport = { ...request, allowedSiteIds: accessibleSiteIds, createdBy: context.profile.id };
    delete storedReport._access;
    await reportStore.setJSON(getAllReportStoreKey(reportId), {
      ...storedReport,
      id: reportId,
      updatedAt: new Date().toISOString()
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, access })
    };
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: "Method not allowed" })
  };
};

async function authorizeAllReportUpdate(request, event, isPhoto = false) {
  const reportId = normalizeAllReportId(request.reportId);
  if (!reportId) return { response: responseError(400, "Invalid report id") };
  const access = await validateReportToken({
    token: request.accessToken || request.tradeKey,
    reportId,
    reportKind: "all_trade",
    requireUpdate: true
  });
  if (!access) return { response: responseError(403, "This report link is read-only, expired, or revoked") };
  const rate = await checkRateLimit(event, isPhoto ? "all-report-photo" : "all-report-update", isPhoto ? 10 : 30, 60, access.organization_id);
  if (!rate.allowed) return { response: rateLimitResponse(rate.retryAfter) };
  const reportStore = createServerStateStore("shared-reports", access.organization_id);
  const report = await reportStore.get(getAllReportStoreKey(reportId), { type: "json" });
  if (!report) return { response: responseError(404, "Report not found") };
  if (access.organization_id !== getOrganizationId(report)) return { response: responseError(403, "This report link is read-only, expired, or revoked") };
  const trade = access.trade_name || report.tradeKeys?.[request.tradeKey];
  if (!trade || (access.trade_name && access.trade_name !== trade)) return { response: responseError(403, "This report link does not match that crew or trade") };
  const item = await getOrganizationPunchItem(access.organization_id, request.issueId);
  if (!item || !getReportSiteIds(report).includes(item.site_id) || item.trade !== trade) {
    return { response: responseError(403, "This item does not belong to that crew report") };
  }
  return { response: null, store: reportStore };
}

async function canManageAllReport(context, reportId = allOpenReportId) {
  if (isAdmin(context)) return true;
  const store = createServerStateStore("shared-reports", context.profile.organization_id);
  const report = await store.get(getAllReportStoreKey(reportId), { type: "json" });
  return Boolean(report?.createdBy && report.createdBy === context.profile.id);
}

function getReportSiteIds(report) {
  return [...new Set([...(report?.allowedSiteIds || []), ...(report?.issues || []).map((issue) => issue.homesiteId)].map(String).filter(Boolean))];
}

async function registerAllReportAccess(report, context) {
  const access = { allItems: null, trades: {} };
  if (report._access?.allItems) {
    access.allItems = await registerReportTokens({
      organizationId: context.profile.organization_id,
      reportId: report.id,
      reportKind: "all_items",
      access: report._access.allItems,
      createdBy: context.profile.id
    });
  }
  for (const [legacyToken, tradeName] of Object.entries(report.tradeKeys || {})) {
    access.trades[tradeName] = await registerReportTokens({
      organizationId: context.profile.organization_id,
      reportId: report.id,
      reportKind: "all_trade",
      tradeName,
      access: report._access?.trades?.[tradeName],
      createdBy: context.profile.id,
      legacyToken
    });
  }
  return access;
}

function normalizeAllReportId(value = allOpenReportId) {
  const reportId = String(value || allOpenReportId);
  if (reportId === allOpenReportId) return reportId;
  if (new RegExp(`^${projectOpenReportPrefix}[A-Za-z0-9_-]{1,80}$`).test(reportId)) return reportId;
  return "";
}

function getProjectIdFromReportId(reportId) {
  return reportId.startsWith(projectOpenReportPrefix) ? reportId.slice(projectOpenReportPrefix.length) : "";
}

function getAllReportStoreKey(reportId) {
  return `report-${reportId}`;
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

async function projectContainsSites(organizationId, projectId, siteIds) {
  if (!siteIds.length) return true;
  const supabaseUrl = process.env.SUPABASE_URL || "";
  const serviceKey = getSupabaseServiceKey();
  if (!supabaseUrl || !serviceKey) return false;
  const url = new URL(`${supabaseUrl}/rest/v1/sites`);
  url.searchParams.set("select", "id");
  url.searchParams.set("organization_id", `eq.${organizationId}`);
  url.searchParams.set("project_id", `eq.${projectId}`);
  const response = await fetch(url, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`
    }
  });
  if (!response.ok) return false;
  const projectSiteIds = new Set((await response.json()).map((row) => String(row.id)));
  return siteIds.every((siteId) => projectSiteIds.has(String(siteId)));
}

async function getCurrentAllTradeIssues(trade, organizationId = getOrganizationId(), allowedSiteIds = []) {
  const supabaseUrl = process.env.SUPABASE_URL || "";
  const serviceKey = getSupabaseServiceKey();
  if (!trade || !organizationId || !supabaseUrl || !serviceKey) return null;
  if (!allowedSiteIds.length) return [];

  const url = new URL(`${supabaseUrl}/rest/v1/punch_items`);
  url.searchParams.set("select", "id,site_id,location,location_area,location_detail,trade,item,notes,shared_note,completed,completed_at,trade_completed,trade_completed_at,created_at,updated_at,sites(id,name,fields,project_id,projects(name)),item_photos(id,storage_path,file_name,content_type,completion_proof,created_at)");
  url.searchParams.set("organization_id", `eq.${organizationId}`);
  url.searchParams.set("site_id", `in.(${allowedSiteIds.join(",")})`);
  url.searchParams.set("trade", `eq.${trade}`);
  url.searchParams.set("completed", "eq.false");
  url.searchParams.set("order", "created_at.asc");

  try {
    const response = await fetch(url, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`
      }
    });
    if (!response.ok) return null;
    const items = await response.json();
    if (!Array.isArray(items)) return null;
    return items.map(mapSupabaseItemToAllReportIssue);
  } catch {
    return null;
  }
}

async function getCurrentAllIssues(organizationId = getOrganizationId(), allowedSiteIds = []) {
  const supabaseUrl = process.env.SUPABASE_URL || "";
  const serviceKey = getSupabaseServiceKey();
  if (!organizationId || !supabaseUrl || !serviceKey) return null;
  if (!allowedSiteIds.length) return [];

  const url = new URL(`${supabaseUrl}/rest/v1/punch_items`);
  url.searchParams.set("select", "id,site_id,location,location_area,location_detail,trade,item,notes,shared_note,completed,completed_at,trade_completed,trade_completed_at,created_at,updated_at,sites(id,name,fields,project_id,projects(name)),item_photos(id,storage_path,file_name,content_type,completion_proof,created_at)");
  url.searchParams.set("organization_id", `eq.${organizationId}`);
  url.searchParams.set("site_id", `in.(${allowedSiteIds.join(",")})`);
  url.searchParams.set("completed", "eq.false");
  url.searchParams.set("order", "created_at.asc");

  try {
    const response = await fetch(url, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`
      }
    });
    if (!response.ok) return null;
    const items = await response.json();
    if (!Array.isArray(items)) return null;
    return items.map(mapSupabaseItemToAllReportIssue);
  } catch {
    return null;
  }
}

function getSupabaseServiceKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_DEFAULT_SECRET_KEY ||
    ""
  );
}

function getOrganizationId(source = {}) {
  return String(source.organizationId || source.organization_id || process.env.SUPABASE_ORGANIZATION_ID || "").trim();
}

function mapSupabaseItemToAllReportIssue(item) {
  const site = item.sites || {};
  const siteFields = normalizeSiteFields(site.fields);
  return {
    id: item.id,
    communityId: site.project_id || "",
    community: site.projects?.name || "No project",
    homesiteId: site.id || item.site_id || "",
    reportId: "",
    homesiteName: site.name || "No site",
    address: getSiteFieldValue(siteFields, "Address"),
    siteFields,
    room: item.location || [item.location_area, item.location_detail].filter(Boolean).join(" - "),
    trade: item.trade || "",
    issue: item.item || "",
    notes: item.notes || "",
    photos: mapSupabasePhotos(item.item_photos),
    createdAt: item.created_at || "",
    updatedAt: item.updated_at || item.created_at || "",
    sharedNote: item.shared_note || "",
    sharedNoteUpdatedAt: "",
    tradeCompleted: Boolean(item.trade_completed),
    tradeCompletedAt: item.trade_completed_at || "",
    completed: Boolean(item.completed),
    completedAt: item.completed_at || ""
  };
}

function mapSupabasePhotos(rows = []) {
  return (rows || []).map((photo) => ({
    id: photo.storage_path || photo.id,
    name: photo.file_name || "completion-photo.jpg",
    type: photo.content_type || "image/jpeg",
    completionProof: Boolean(photo.completion_proof),
    createdAt: photo.created_at || ""
  }));
}

async function addCompletionPhoto(request, reportStore) {
  if (!request.issueId) return responseError(400, "Missing photo details");
  const match = String(request.photo?.dataUrl || "").match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!match) return responseError(400, "Choose a JPG, PNG, or WebP photo");

  const reportId = normalizeAllReportId(request.reportId);
  const report = await reportStore.get(getAllReportStoreKey(reportId), { type: "json" });
  if (!report) return responseError(404, "Report not found");
  const issue = (report.issues || []).find((item) => item.id === request.issueId);
  if (!issue) return responseError(404, "Issue not found");

  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > 1500000) return responseError(413, "Photo is too large");
  const fileName = String(request.photo?.name || "completion-photo.jpg").slice(0, 180);
  const photoId = String(request.mutationId || crypto.randomUUID());
  const organizationId = getOrganizationId(report || request);
  const storagePath = await uploadPhotoToSupabaseStorage({
    organizationId,
    itemId: request.issueId,
    photoId,
    fileName,
    contentType: match[1],
    buffer,
    upsert: Boolean(request.mutationId)
  });

  const photo = { id: storagePath, storagePath, name: fileName, type: match[1], completionProof: true, createdAt: new Date().toISOString() };
  issue.photos = [...(issue.photos || []).filter((entry) => entry.id !== photo.id), photo];
  report.updatedAt = new Date().toISOString();
  await reportStore.setJSON(getAllReportStoreKey(reportId), report);

  try {
    await upsertItemPhoto({ id: photoId, organizationId, itemId: request.issueId, storagePath, fileName, contentType: match[1], completionProof: true });
  } catch (error) {
    return responseError(error.statusCode || 503, error.message || "Photo details could not be saved");
  }
  await syncMainAppIssuePhoto(request.issueId, photo, organizationId);
  await syncSiteReportIssuePhoto(reportStore, issue, photo);
  return { statusCode: 200, headers, body: JSON.stringify({ ok: true, photo }) };
}

function responseError(statusCode, message) {
  return { statusCode, headers, body: JSON.stringify({ error: message }) };
}

async function syncSupabaseIssuePhoto(issueId, photo, organizationId = "") {
  const supabaseUrl = process.env.SUPABASE_URL || "";
  const serviceKey = getSupabaseServiceKey();
  if (!supabaseUrl || !serviceKey || !organizationId) return;
  await fetch(`${supabaseUrl}/rest/v1/item_photos`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    },
    body: JSON.stringify({
      organization_id: organizationId,
      item_id: issueId,
      storage_path: photo.storagePath || photo.id,
      file_name: photo.name,
      content_type: photo.type,
      completion_proof: true
    })
  });
}

async function syncMainAppIssuePhoto(issueId, photo, organizationId) {
  const appStore = createServerStateStore("app-state", organizationId);
  const state = await appStore.get("app-state", { type: "json" });
  if (!state?.communities?.length) return;
  for (const community of state.communities) {
    for (const homesite of community.homesites || []) {
      const issue = (homesite.issues || []).find((item) => item.id === issueId);
      if (!issue) continue;
      issue.photos = [...(issue.photos || []).filter((entry) => entry.id !== photo.id), photo];
      await appStore.setJSON("app-state", state);
      return;
    }
  }
}

async function syncSiteReportIssuePhoto(reportStore, issue, photo) {
  if (!issue?.reportId) return;
  const report = await reportStore.get(`report-${issue.reportId}`, { type: "json" });
  if (!report) return;
  const siteIssue = (report.issues || []).find((item) => item.id === issue.id);
  if (!siteIssue) return;
  siteIssue.photos = [...(siteIssue.photos || []).filter((entry) => entry.id !== photo.id), photo];
  report.updatedAt = new Date().toISOString();
  await reportStore.setJSON(`report-${issue.reportId}`, report);
}

function normalizeSiteFields(fields) {
  if (!Array.isArray(fields)) return [];
  return fields
    .map((field) => ({
      label: String(field?.label || "").trim(),
      value: String(field?.value || "").trim()
    }))
    .filter((field) => field.label && field.value);
}

function getSiteFieldValue(fields, label) {
  const normalized = String(label || "").toLowerCase();
  return fields.find((field) => String(field?.label || "").toLowerCase() === normalized)?.value || "";
}

async function setTradeCompleted(request, reportStore) {
  if (!request.issueId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Missing issue update details" })
    };
  }

  const reportId = normalizeAllReportId(request.reportId);
  const report = await reportStore.get(getAllReportStoreKey(reportId), { type: "json" });
  const organizationId = getOrganizationId(report || request);
  const completed = Boolean(request.completed);
  const completedAt = completed ? request.clientUpdatedAt || new Date().toISOString() : "";
  let mutationResult;
  try {
    mutationResult = await applyPunchItemPatch({
      organizationId,
      mutationId: request.mutationId || crypto.randomUUID(),
      itemId: request.issueId,
      baseUpdatedAt: request.baseUpdatedAt,
      clientUpdatedAt: request.clientUpdatedAt,
      patch: { trade_completed: completed, trade_completed_at: completedAt || null }
    });
  } catch (error) {
    return responseError(error.statusCode || 503, error.message || "Issue could not be synchronized");
  }
  if (!report) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        issue: {
          id: request.issueId,
          tradeCompleted: completed,
          tradeCompletedAt: completedAt
        }
      })
    };
  }

  const issue = (report.issues || []).find((item) => item.id === request.issueId);
  if (!issue) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: "Issue not found" })
    };
  }

  issue.tradeCompleted = completed;
  issue.tradeCompletedAt = completedAt;
  issue.updatedAt = mutationResult?.updated_at || request.clientUpdatedAt || new Date().toISOString();
  report.updatedAt = new Date().toISOString();
  await reportStore.setJSON(getAllReportStoreKey(reportId), report);
  await syncMainAppTradeStatus(request.issueId, completed, issue.tradeCompletedAt, organizationId);
  await syncHomesiteSharedReport(reportStore, issue, completed, issue.tradeCompletedAt);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ ok: true, issue })
  };
}

async function updateIssueNote(request, reportStore) {
  if (!request.issueId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Missing note update details" })
    };
  }

  const reportId = normalizeAllReportId(request.reportId);
  const report = await reportStore.get(getAllReportStoreKey(reportId), { type: "json" });
  const organizationId = getOrganizationId(report || request);
  if (!report) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: "Report not found" })
    };
  }

  const issue = (report.issues || []).find((item) => item.id === request.issueId);
  if (!issue) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: "Issue not found" })
    };
  }

  issue.sharedNote = String(request.sharedNote || "").trim();
  issue.sharedNoteUpdatedAt = request.clientUpdatedAt || new Date().toISOString();
  let mutationResult;
  try {
    mutationResult = await applyPunchItemPatch({
      organizationId,
      mutationId: request.mutationId || crypto.randomUUID(),
      itemId: request.issueId,
      baseUpdatedAt: request.baseUpdatedAt,
      clientUpdatedAt: request.clientUpdatedAt,
      patch: {
        shared_note: issue.sharedNote,
        shared_note_updated_at: issue.sharedNoteUpdatedAt,
        shared_note_source: "crew_report"
      }
    });
  } catch (error) {
    return responseError(error.statusCode || 503, error.message || "Note could not be synchronized");
  }
  issue.updatedAt = mutationResult?.updated_at || issue.sharedNoteUpdatedAt;
  await syncSupabaseIssueNote(request.issueId, issue.sharedNote, issue.sharedNoteUpdatedAt, organizationId);
  report.updatedAt = new Date().toISOString();
  await reportStore.setJSON(getAllReportStoreKey(reportId), report);
  await syncMainAppIssueNote(request.issueId, issue.sharedNote, issue.sharedNoteUpdatedAt, organizationId);
  await syncHomesiteSharedReportNote(reportStore, issue, issue.sharedNote, issue.sharedNoteUpdatedAt);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ ok: true, issue })
  };
}

async function syncMainAppTradeStatus(issueId, completed, completedAt, organizationId) {
  const appStore = createServerStateStore("app-state", organizationId);
  const state = await appStore.get("app-state", { type: "json" });
  if (!state?.communities?.length) return;

  for (const community of state.communities) {
    for (const homesite of community.homesites || []) {
      const issue = (homesite.issues || []).find((item) => item.id === issueId);
      if (!issue) continue;

      issue.tradeCompleted = completed;
      issue.tradeCompletedAt = completedAt;
      await appStore.setJSON("app-state", state);
      return;
    }
  }
}

async function syncSupabaseTradeStatus(issueId, completed, completedAt, organizationId = "") {
  const supabaseUrl = process.env.SUPABASE_URL || "";
  const serviceKey = getSupabaseServiceKey();
  if (!supabaseUrl || !serviceKey || !organizationId) return;

  try {
    await fetch(`${supabaseUrl}/rest/v1/punch_items?id=eq.${encodeURIComponent(issueId)}&organization_id=eq.${encodeURIComponent(organizationId)}`, {
      method: "PATCH",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify({
        trade_completed: completed,
        trade_completed_at: completed ? completedAt || new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
    });
  } catch {
    // Report snapshots still update; Supabase can be refreshed on a later action.
  }
}

async function syncSupabaseIssueNote(issueId, sharedNote, sharedNoteUpdatedAt, organizationId = "") {
  const supabaseUrl = process.env.SUPABASE_URL || "";
  const serviceKey = getSupabaseServiceKey();
  if (!supabaseUrl || !serviceKey || !organizationId) return;

  try {
    await fetch(`${supabaseUrl}/rest/v1/punch_items?id=eq.${encodeURIComponent(issueId)}&organization_id=eq.${encodeURIComponent(organizationId)}`, {
      method: "PATCH",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify({
        shared_note: sharedNote,
        shared_note_updated_at: sharedNoteUpdatedAt || new Date().toISOString(),
        shared_note_source: "crew_report",
        updated_at: sharedNoteUpdatedAt || new Date().toISOString()
      })
    });
  } catch {
    // Report snapshots still update; Supabase can be refreshed on a later action.
  }
}

async function syncMainAppIssueNote(issueId, sharedNote, sharedNoteUpdatedAt, organizationId) {
  const appStore = createServerStateStore("app-state", organizationId);
  const state = await appStore.get("app-state", { type: "json" });
  if (!state?.communities?.length) return;

  for (const community of state.communities) {
    for (const homesite of community.homesites || []) {
      const issue = (homesite.issues || []).find((item) => item.id === issueId);
      if (!issue) continue;

      issue.sharedNote = sharedNote;
      issue.sharedNoteUpdatedAt = sharedNoteUpdatedAt;
      await appStore.setJSON("app-state", state);
      return;
    }
  }
}

async function syncHomesiteSharedReport(reportStore, sourceIssue, completed, completedAt) {
  if (!sourceIssue.reportId) return;

  const homesiteReport = await reportStore.get(`report-${sourceIssue.reportId}`, { type: "json" });
  if (!homesiteReport) return;

  const issue = (homesiteReport.issues || []).find((item) => item.id === sourceIssue.id);
  if (!issue) return;

  issue.tradeCompleted = completed;
  issue.tradeCompletedAt = completedAt;
  homesiteReport.updatedAt = new Date().toISOString();
  await reportStore.setJSON(`report-${sourceIssue.reportId}`, homesiteReport);
}

async function syncHomesiteSharedReportNote(reportStore, sourceIssue, sharedNote, sharedNoteUpdatedAt) {
  if (!sourceIssue.reportId) return;

  const homesiteReport = await reportStore.get(`report-${sourceIssue.reportId}`, { type: "json" });
  if (!homesiteReport) return;

  const issue = (homesiteReport.issues || []).find((item) => item.id === sourceIssue.id);
  if (!issue) return;

  issue.sharedNote = sharedNote;
  issue.sharedNoteUpdatedAt = sharedNoteUpdatedAt;
  homesiteReport.updatedAt = new Date().toISOString();
  await reportStore.setJSON(`report-${sourceIssue.reportId}`, homesiteReport);
}
