const { getRequestContext } = require("./_auth");
const { checkRateLimit, rateLimitResponse } = require("./_rate_limit");
const {
  registerShortReportLink,
  resolveShortReportLink,
  validateReportToken
} = require("./_report_access");

const jsonHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store"
};

exports.handler = async (event) => {
  try {
    if (event.httpMethod === "GET") return resolveLink(event);
    if (event.httpMethod === "POST") return createLink(event);
    return responseError(405, "Method not allowed");
  } catch (error) {
    console.error("Short report link failed.", error);
    return responseError(500, error?.message || "Short report links are not available right now.");
  }
};

async function createLink(event) {
  const context = await getRequestContext(event);
  if (!context) return responseError(401, "Unauthorized");

  const rate = await checkRateLimit(event, "report-link-create", 60, 60, context.profile.organization_id);
  if (!rate.allowed) return rateLimitResponse(rate.retryAfter);

  const request = JSON.parse(event.body || "{}");
  const target = parseReportTarget(request.url);
  if (!target) return responseError(400, "That is not a Punch Logic report link.");

  const access = await validateReportToken({
    token: target.token,
    reportId: target.reportId,
    reportKind: target.reportKind
  });
  if (!access || access.organization_id !== context.profile.organization_id) {
    return responseError(403, "This login cannot shorten that report link.");
  }

  const code = await registerShortReportLink({
    token: target.token,
    access,
    createdBy: context.profile.id
  });
  const path = `/r/${encodeURIComponent(code)}`;
  return {
    statusCode: 200,
    headers: jsonHeaders,
    body: JSON.stringify({ ok: true, path, url: `${requestOrigin(event)}${path}` })
  };
}

async function resolveLink(event) {
  const code = getShortCode(event);
  if (!/^[A-Za-z0-9_-]{12}$/.test(code)) return reportNotFound();

  const rate = await checkRateLimit(event, "report-link-resolve", 90, 60);
  if (!rate.allowed) return rateLimitResponse(rate.retryAfter);

  const link = await resolveShortReportLink(code);
  if (!link) return reportNotFound();

  const query = new URLSearchParams({ access: code, short: code });
  if (String(event.queryStringParameters?.pdf || "") === "1") query.set("pdf", "1");
  let page;
  if (link.report_kind === "site") {
    page = "/home-report.html";
    query.set("r", link.report_id);
  } else if (link.report_kind === "trade") {
    page = "/trade-report.html";
    query.set("r", link.report_id);
    query.set("trade", code);
  } else if (link.report_kind === "all_trade") {
    page = "/all-trade-report.html";
    query.set("r", link.report_id);
    query.set("trade", code);
    if (link.trade_name) query.set("tradeName", link.trade_name);
  } else if (link.report_kind === "all_items") {
    page = "/all-trade-report.html";
    query.set("r", link.report_id);
  } else {
    return reportNotFound();
  }

  return {
    statusCode: 302,
    headers: {
      Location: `${page}?${query}`,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer"
    },
    body: ""
  };
}

function getShortCode(event = {}) {
  const queryCode = String(event.queryStringParameters?.code || "").trim();
  if (/^[A-Za-z0-9_-]{12}$/.test(queryCode)) return queryCode;

  const pathCandidates = [event.path, event.rawPath, event.rawUrl];
  for (const candidate of pathCandidates) {
    if (!candidate) continue;
    let pathname = String(candidate);
    try {
      pathname = new URL(pathname, "https://punchlogic.invalid").pathname;
    } catch {
      // Use the original value if it is already a pathname.
    }
    const match = pathname.match(/\/r\/([A-Za-z0-9_-]{12})\/?$/);
    if (match) return match[1];
  }
  return "";
}

function parseReportTarget(value) {
  if (!value) return null;
  let url;
  try {
    url = new URL(value, "https://punchlogic.invalid");
  } catch {
    return null;
  }

  const path = url.pathname.toLowerCase();
  const token = url.searchParams.get("access") || "";
  if (!token) return null;
  if (path.endsWith("/home-report.html")) {
    const reportId = url.searchParams.get("r") || "";
    return reportId ? { token, reportId, reportKind: "site" } : null;
  }
  if (path.endsWith("/trade-report.html")) {
    const reportId = url.searchParams.get("r") || "";
    return reportId ? { token, reportId, reportKind: "trade" } : null;
  }
  if (path.endsWith("/all-trade-report.html")) {
    return {
      token,
      reportId: url.searchParams.get("r") || "all-open-items",
      reportKind: url.searchParams.get("trade") ? "all_trade" : "all_items"
    };
  }
  return null;
}

function requestOrigin(event) {
  const host = event.headers["x-forwarded-host"] || event.headers.host || "";
  const protocol = event.headers["x-forwarded-proto"] || "https";
  return host ? `${protocol}://${host}` : "";
}

function responseError(statusCode, message) {
  return {
    statusCode,
    headers: jsonHeaders,
    body: JSON.stringify({ error: message })
  };
}

function reportNotFound() {
  return {
    statusCode: 404,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store"
    },
    body: "<!doctype html><title>Report not found</title><main><h1>Report not found</h1><p>This report link is invalid, expired, or revoked.</p></main>"
  };
}

module.exports.getShortCode = getShortCode;
module.exports.parseReportTarget = parseReportTarget;
