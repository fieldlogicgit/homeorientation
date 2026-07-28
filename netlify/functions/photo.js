const crypto = require("crypto");
const { getRequestContext, getSupabaseConfig } = require("./_auth");
const { createSignedPhotoUrl, downloadPhotoFromSupabaseStorage, uploadPhotoToSupabaseStorage } = require("./_photos");
const { checkRateLimit, rateLimitResponse } = require("./_rate_limit");
const { validateReportToken } = require("./_report_access");
const { createServerStateStore } = require("./_server_state");
const { safeFileName, validatePhotoBuffer } = require("./_upload_security");

const jsonHeaders = {
  "Content-Type": "application/json"
};

exports.handler = async (event) => {
  try {
    const rate = await checkRateLimit(event, event.httpMethod === "GET" ? "photo-read" : "photo-upload", event.httpMethod === "GET" ? 240 : 20);
    if (!rate.allowed) return rateLimitResponse(rate.retryAfter);

    if (event.httpMethod === "POST") {
      const context = await getRequestContext(event);
      if (!context) {
        return { statusCode: 401, headers: jsonHeaders, body: JSON.stringify({ error: "Unauthorized" }) };
      }
      return savePhoto(event, context);
    }

    if (event.httpMethod === "GET") {
      const authorization = await authorizePhotoRead(event);
      if (!authorization.allowed) {
        return { statusCode: authorization.statusCode, headers: jsonHeaders, body: JSON.stringify({ error: authorization.error }) };
      }
      return readPhoto(event);
    }

    return {
      statusCode: 405,
      headers: jsonHeaders,
      body: JSON.stringify({ error: "Method not allowed" })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ error: error.message || "Photo function failed" })
    };
  }
};

async function savePhoto(event, context) {
  const body = JSON.parse(event.body || "{}");
  const match = String(body.dataUrl || "").match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);

  if (!match) {
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ error: "Invalid photo" })
    };
  }

  const [, claimedType, base64] = match;
  const requestedId = String(body.photoId || "").trim();
  const id = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestedId)
    ? requestedId
    : crypto.randomUUID();
  const buffer = Buffer.from(base64, "base64");
  const contentType = validatePhotoBuffer(buffer, claimedType);
  const fileName = safeFileName(body.name, "issue-photo.jpg");
  const organizationId = String(body.organizationId || body.organization_id || "");
  if (!organizationId || organizationId !== context.profile.organization_id) {
    return { statusCode: 403, headers: jsonHeaders, body: JSON.stringify({ error: "Photo organization does not match this login." }) };
  }
  const itemId = String(body.itemId || body.item_id || "");
  if (!await signedInUserCanReadItem(context, itemId)) {
    return { statusCode: 403, headers: jsonHeaders, body: JSON.stringify({ error: "Photo item is not available to this login." }) };
  }
  const storagePath = await uploadPhotoToSupabaseStorage({
    organizationId,
    itemId,
    photoId: id,
    fileName,
    contentType,
    buffer,
    upsert: Boolean(requestedId)
  });
  const signedUrl = await createSignedPhotoUrl(storagePath);

  return {
    statusCode: 200,
    headers: jsonHeaders,
    body: JSON.stringify({ id: storagePath, signedUrl, name: fileName, type: contentType })
  };
}

async function authorizePhotoRead(event) {
  const storagePath = String(event.queryStringParameters?.id || "");
  const path = parsePhotoPath(storagePath);
  if (!path) return denied(400, "Invalid photo id");

  const context = await getRequestContext(event);
  if (context) {
    if (context.profile.organization_id !== path.organizationId) return denied(403, "Photo does not belong to this organization");
    return await signedInUserCanReadItem(context, path.itemId)
      ? { allowed: true }
      : denied(403, "Photo is not available to this login");
  }

  return authorizeReportPhoto(event, path);
}

function parsePhotoPath(storagePath) {
  const parts = storagePath.split("/").filter(Boolean);
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (parts.length !== 3 || !uuid.test(parts[0]) || !uuid.test(parts[1]) || !parts[2]) return null;
  return { organizationId: parts[0], itemId: parts[1] };
}

async function signedInUserCanReadItem(context, itemId) {
  const { url, publishableKey } = getSupabaseConfig();
  if (!url || !publishableKey) return false;
  const query = new URL(`${url}/rest/v1/punch_items`);
  query.searchParams.set("id", `eq.${itemId}`);
  query.searchParams.set("organization_id", `eq.${context.profile.organization_id}`);
  query.searchParams.set("select", "id");
  query.searchParams.set("limit", "1");
  const response = await fetch(query, {
    headers: { apikey: publishableKey, Authorization: `Bearer ${context.token}` }
  });
  if (!response.ok) return false;
  const rows = await response.json();
  return Boolean(rows?.length);
}

async function authorizeReportPhoto(event, path) {
  const query = event.queryStringParameters || {};
  const reportId = String(query.reportId || "");
  const reportKind = String(query.reportKind || "");
  if (!reportId || !["site", "trade", "all_trade", "all_items"].includes(reportKind)) return denied(401, "Photo access requires a valid login or report link");

  const access = await validateReportToken({ token: query.access, reportId, reportKind });
  if (!access || access.organization_id !== path.organizationId) return denied(403, "Photo report link is invalid, expired, or revoked");
  const item = await getReportItem(path);
  if (!item) return denied(404, "Photo item was not found");

  if (reportKind === "all_trade" || reportKind === "all_items") {
    const reportStore = createServerStateStore("shared-reports", access.organization_id);
    const report = await reportStore.get(`report-${reportId}`, { type: "json" });
    const allowedSiteIds = new Set([...(report?.allowedSiteIds || []), ...(report?.issues || []).map((issue) => issue.homesiteId)].map(String).filter(Boolean));
    return report && allowedSiteIds.has(item.site_id) && (reportKind === "all_items" || (access.trade_name && item.trade === access.trade_name))
      ? { allowed: true }
      : denied(403, reportKind === "all_items" ? "Photo does not belong to this report" : "Photo does not belong to this crew report");
  }

  const reportStore = createServerStateStore("shared-reports", access.organization_id);
  const report = await reportStore.get(`report-${reportId}`, { type: "json" });
  if (!report || report.homesite?.id !== item.site_id) return denied(403, "Photo does not belong to this site report");
  if (reportKind === "trade" && (!access.trade_name || access.trade_name !== item.trade)) {
    return denied(403, "Photo does not belong to this crew report");
  }
  return { allowed: true };
}

async function getReportItem(path) {
  const { url, serviceKey } = getSupabaseConfig();
  if (!url || !serviceKey) return null;
  const query = new URL(`${url}/rest/v1/punch_items`);
  query.searchParams.set("id", `eq.${path.itemId}`);
  query.searchParams.set("organization_id", `eq.${path.organizationId}`);
  query.searchParams.set("select", "id,site_id,trade");
  query.searchParams.set("limit", "1");
  const response = await fetch(query, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
  });
  if (!response.ok) return null;
  const rows = await response.json();
  return rows?.[0] || null;
}

function denied(statusCode, error) {
  return { allowed: false, statusCode, error };
}

async function readPhoto(event) {
  const id = event.queryStringParameters?.id;
  if (!id) {
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ error: "Missing photo id" })
    };
  }

  const supabasePhoto = await downloadPhotoFromSupabaseStorage(id);
  if (supabasePhoto) {
    return {
      statusCode: 200,
      headers: {
        "Content-Type": supabasePhoto.contentType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff"
      },
      isBase64Encoded: true,
      body: supabasePhoto.buffer.toString("base64")
    };
  }

  return {
    statusCode: 404,
    headers: jsonHeaders,
    body: JSON.stringify({ error: "Photo not found" })
  };
}
