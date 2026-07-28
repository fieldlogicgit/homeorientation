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

exports.handler = async (event) => {
  if (event.httpMethod === "GET") {
    const id = event.queryStringParameters?.id;
    if (!id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing report id" })
      };
    }

    const tradeKey = event.queryStringParameters?.trade;
    const token = event.queryStringParameters?.access || tradeKey || id;
    const access = await validateReportToken({ token, reportId: id, reportKind: tradeKey ? "trade" : "site" });
    if (!access) return responseError(403, "This report link is invalid, expired, or revoked");
    const rate = await checkRateLimit(event, "shared-report-read", 120, 60, access.organization_id);
    if (!rate.allowed) return rateLimitResponse(rate.retryAfter);
    const store = createServerStateStore("shared-reports", access.organization_id);

    const report = await store.get(`report-${id}`, { type: "json" });
    if (!report) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "Report not found" })
      };
    }

    if (tradeKey) {
      const trade = access.trade_name || report.tradeKeys?.[tradeKey];
      if (!trade || (access.trade_name && access.trade_name !== trade)) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: "Crew report not found" })
        };
      }

      report.trade = trade;
      report.issues = await getCurrentTradeIssues(report, trade) || (report.issues || []).filter((issue) => issue.trade === trade);
    } else {
      report.issues = await getCurrentSiteIssues(report) || report.issues || [];
    }
    report.accessPermission = access.permission;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(report)
    };
  }

  if (event.httpMethod === "POST") {
    const report = JSON.parse(event.body || "{}");

    if (report.action === "revokeReportAccess") {
      const context = await getRequestContext(event);
      if (!context) return responseError(401, "Unauthorized");
      if (!await canManageSharedReport(context, report.reportId)) return responseError(403, "You cannot revoke this report");
      let revokedCount = 0;
      if (report.reportId && ["site", "trade"].includes(report.reportKind)) {
        revokedCount += await revokeReportScope({
          organizationId: context.profile.organization_id,
          reportId: report.reportId,
          reportKind: report.reportKind,
          tradeName: report.reportKind === "trade" ? report.tradeName : null
        });
      }
      for (const token of report.tokens || []) {
        if (await revokeReportToken({ token, organizationId: context.profile.organization_id })) revokedCount += 1;
      }
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, revokedCount }) };
    }

    if (report.action === "setTradeCompleted" || report.action === "setIssueCompleted") {
      const authorized = await authorizeReportUpdate(report, event);
      if (authorized.response) return authorized.response;
      return setTradeCompleted(report, authorized.store, report.action === "setIssueCompleted");
    }

    if (report.action === "updateIssueNote") {
      const authorized = await authorizeReportUpdate(report, event);
      if (authorized.response) return authorized.response;
      return updateIssueNote(report, authorized.store);
    }

    if (report.action === "addCompletionPhoto") {
      if (report.reportKind !== "trade") {
        return responseError(403, "Completion photos can only be uploaded from a specific crew report");
      }
      const authorized = await authorizeReportUpdate(report, event, true);
      if (authorized.response) return authorized.response;
      return addCompletionPhoto(report, authorized.store);
    }

    const context = await getRequestContext(event);
    if (!context) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Unauthorized" })
      };
    }

    if (!report.id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing report id" })
      };
    }

    if (getOrganizationId(report) !== context.profile.organization_id) return responseError(403, "Report organization does not match this login");
    const reportSiteId = String(report.homesite?.id || "");
    const accessibleSiteIds = await getUserAccessibleSiteIds(context, [reportSiteId]);
    if (!reportSiteId || !accessibleSiteIds.includes(reportSiteId)) return responseError(403, "This login cannot create a report for that site");

    const access = await registerSharedReportAccess(report, context);
    const store = createServerStateStore("shared-reports", context.profile.organization_id);
    const storedReport = { ...report, createdBy: context.profile.id };
    delete storedReport._access;

    await store.setJSON(`report-${report.id}`, {
      ...storedReport,
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

async function authorizeReportUpdate(request, event, isPhoto = false) {
  const reportKind = request.reportKind === "trade" ? "trade" : "site";
  const access = await validateReportToken({
    token: request.accessToken || request.tradeKey || request.id,
    reportId: request.id,
    reportKind,
    requireUpdate: true
  });
  if (!access) return { response: responseError(403, "This report link is read-only, expired, or revoked") };
  const rate = await checkRateLimit(event, isPhoto ? "shared-report-photo" : "shared-report-update", isPhoto ? 10 : 30, 60, access.organization_id);
  if (!rate.allowed) return { response: rateLimitResponse(rate.retryAfter) };
  const reportStore = createServerStateStore("shared-reports", access.organization_id);
  const report = await reportStore.get(`report-${request.id}`, { type: "json" });
  if (!report) return { response: responseError(404, "Report not found") };
  if (access.organization_id !== getOrganizationId(report)) return { response: responseError(403, "This report link is read-only, expired, or revoked") };
  if (reportKind === "trade") {
    const trade = access.trade_name || report.tradeKeys?.[request.tradeKey];
    if (!trade || (access.trade_name && access.trade_name !== trade)) return { response: responseError(403, "This report link does not match that crew or trade") };
  }
  const item = await getOrganizationPunchItem(access.organization_id, request.issueId);
  if (!item || item.site_id !== report.homesite?.id) return { response: responseError(403, "This item does not belong to that site report") };
  if (reportKind === "trade" && access.trade_name !== item.trade) {
    return { response: responseError(403, "This item does not belong to that crew report") };
  }
  return { response: null, store: reportStore };
}

async function canManageSharedReport(context, reportId) {
  if (isAdmin(context)) return true;
  if (!reportId) return false;
  const store = createServerStateStore("shared-reports", context.profile.organization_id);
  const storedReport = await store.get(`report-${reportId}`, { type: "json" });
  return Boolean(storedReport?.createdBy && storedReport.createdBy === context.profile.id);
}

async function registerSharedReportAccess(report, context) {
  const organizationId = context.profile.organization_id;
  const createdBy = context.profile.id;
  const access = { site: null, trades: {} };
  access.site = await registerReportTokens({
    organizationId,
    reportId: report.id,
    reportKind: "site",
    access: report._access?.site,
    createdBy,
    legacyToken: report.id
  });
  for (const [legacyToken, tradeName] of Object.entries(report.tradeKeys || {})) {
    access.trades[tradeName] = await registerReportTokens({
      organizationId,
      reportId: report.id,
      reportKind: "trade",
      tradeName,
      access: report._access?.trades?.[tradeName],
      createdBy,
      legacyToken
    });
  }
  return access;
}

async function getCurrentTradeIssues(report, trade) {
  const siteId = report.homesite?.id;
  const organizationId = getOrganizationId(report);
  const supabaseUrl = process.env.SUPABASE_URL || "";
  const serviceKey = getSupabaseServiceKey();
  if (!siteId || !trade || !organizationId || !supabaseUrl || !serviceKey) return null;

  const url = new URL(`${supabaseUrl}/rest/v1/punch_items`);
  url.searchParams.set("select", "id,location,location_area,location_detail,trade,item,notes,shared_note,completed,completed_at,trade_completed,trade_completed_at,created_at,updated_at,item_photos(id,storage_path,file_name,content_type,completion_proof,created_at)");
  url.searchParams.set("organization_id", `eq.${organizationId}`);
  url.searchParams.set("site_id", `eq.${siteId}`);
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
    return items.map(mapSupabaseItemToReportIssue);
  } catch {
    return null;
  }
}

async function getCurrentSiteIssues(report) {
  const siteId = report.homesite?.id;
  const organizationId = getOrganizationId(report);
  const supabaseUrl = process.env.SUPABASE_URL || "";
  const serviceKey = getSupabaseServiceKey();
  if (!siteId || !organizationId || !supabaseUrl || !serviceKey) return null;

  const url = new URL(`${supabaseUrl}/rest/v1/punch_items`);
  url.searchParams.set("select", "id,location,location_area,location_detail,trade,item,notes,shared_note,completed,completed_at,trade_completed,trade_completed_at,created_at,updated_at,item_photos(id,storage_path,file_name,content_type,completion_proof,created_at)");
  url.searchParams.set("organization_id", `eq.${organizationId}`);
  url.searchParams.set("site_id", `eq.${siteId}`);
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
    return items.map(mapSupabaseItemToReportIssue);
  } catch {
    return null;
  }
}

function mapSupabaseItemToReportIssue(item) {
  return {
    id: item.id,
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
  if (!request.id || !request.issueId) return responseError(400, "Missing photo details");
  const match = String(request.photo?.dataUrl || "").match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!match) return responseError(400, "Choose a JPG, PNG, or WebP photo");

  const report = await reportStore.get(`report-${request.id}`, { type: "json" });
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
  await reportStore.setJSON(`report-${request.id}`, report);

  try {
    await upsertItemPhoto({ id: photoId, organizationId, itemId: request.issueId, storagePath, fileName, contentType: match[1], completionProof: true });
  } catch (error) {
    return responseError(error.statusCode || 503, error.message || "Photo details could not be saved");
  }
  await syncMainAppIssuePhoto(request.issueId, photo, organizationId);
  await syncAllReportIssuePhoto(reportStore, request.issueId, photo);

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

async function syncAllReportIssuePhoto(reportStore, issueId, photo) {
  const report = await reportStore.get("report-all-open-items", { type: "json" });
  if (!report) return;
  const issue = (report.issues || []).find((item) => item.id === issueId);
  if (!issue) return;
  issue.photos = [...(issue.photos || []).filter((entry) => entry.id !== photo.id), photo];
  report.updatedAt = new Date().toISOString();
  await reportStore.setJSON("report-all-open-items", report);
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

async function setTradeCompleted(request, reportStore, clearOwnerCompleted = false) {
  if (!request.id || !request.issueId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Missing issue update details" })
    };
  }

  const report = await reportStore.get(`report-${request.id}`, { type: "json" });
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
      patch: {
        trade_completed: completed,
        trade_completed_at: completedAt || null,
        ...(clearOwnerCompleted ? { completed: false, completed_at: null } : {})
      }
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
          tradeCompletedAt: completedAt,
          completed: false,
          completedAt: ""
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
  if (clearOwnerCompleted) {
    issue.completed = false;
    issue.completedAt = "";
  }
  report.updatedAt = new Date().toISOString();

  await reportStore.setJSON(`report-${request.id}`, report);
  await syncMainAppTradeStatus(request.id, request.issueId, completed, issue.tradeCompletedAt, clearOwnerCompleted, organizationId);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ ok: true, issue })
  };
}

async function syncSupabaseTradeStatus(issueId, completed, completedAt, clearOwnerCompleted = false, organizationId = "") {
  const supabaseUrl = process.env.SUPABASE_URL || "";
  const serviceKey = getSupabaseServiceKey();
  if (!supabaseUrl || !serviceKey || !organizationId) return;

  const body = {
    trade_completed: completed,
    trade_completed_at: completed ? completedAt || new Date().toISOString() : null,
    updated_at: new Date().toISOString()
  };

  if (clearOwnerCompleted) {
    body.completed = false;
    body.completed_at = null;
  }

  try {
    await fetch(`${supabaseUrl}/rest/v1/punch_items?id=eq.${encodeURIComponent(issueId)}&organization_id=eq.${encodeURIComponent(organizationId)}`, {
      method: "PATCH",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify(body)
    });
  } catch {
    // The report snapshot is still updated; Supabase can be refreshed on a later action.
  }
}

async function updateIssueNote(request, reportStore) {
  if (!request.id || !request.issueId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Missing note update details" })
    };
  }

  const report = await reportStore.get(`report-${request.id}`, { type: "json" });
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

  await reportStore.setJSON(`report-${request.id}`, report);
  await syncMainAppIssueNote(request.issueId, issue.sharedNote, issue.sharedNoteUpdatedAt, organizationId);
  await syncAllReportIssueNote(reportStore, request.issueId, issue.sharedNote, issue.sharedNoteUpdatedAt);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ ok: true, issue })
  };
}

async function syncMainAppTradeStatus(reportId, issueId, completed, completedAt, clearOwnerCompleted = false, organizationId = "") {
  const appStore = createServerStateStore("app-state", organizationId);
  const state = await appStore.get("app-state", { type: "json" });
  if (!state?.communities?.length) return;

  for (const community of state.communities) {
    for (const homesite of community.homesites || []) {
      if (homesite.reportId !== reportId) continue;
      const issue = (homesite.issues || []).find((item) => item.id === issueId);
      if (!issue) continue;

      issue.tradeCompleted = completed;
      issue.tradeCompletedAt = completedAt;
      if (clearOwnerCompleted) {
        issue.completed = false;
        issue.completedAt = "";
      }
      await appStore.setJSON("app-state", state);
      return;
    }
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

async function syncAllReportIssueNote(reportStore, issueId, sharedNote, sharedNoteUpdatedAt) {
  const report = await reportStore.get("report-all-open-items", { type: "json" });
  if (!report) return;

  const issue = (report.issues || []).find((item) => item.id === issueId);
  if (!issue) return;

  issue.sharedNote = sharedNote;
  issue.sharedNoteUpdatedAt = sharedNoteUpdatedAt;
  report.updatedAt = new Date().toISOString();
  await reportStore.setJSON("report-all-open-items", report);
}
