const { getRequestContext } = require("./_auth");

const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store"
};

const supabaseUrl = process.env.SUPABASE_URL || "";
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_DEFAULT_SECRET_KEY ||
  "";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return response(405, { error: "Method not allowed" });
  }

  if (!supabaseUrl || !serviceKey) {
    return response(500, { error: "Supabase service key is not configured." });
  }

  try {
    const requester = (await getRequestContext(event))?.profile;
    if (!requester) {
      return response(401, { error: "Your admin login could not be verified. Sign out, sign back in, then try again." });
    }
    if (requester.role !== "admin") {
      return response(403, { error: `Only admins can create users. This login is currently marked as ${requester.role || "no role"}.` });
    }

    const body = JSON.parse(event.body || "{}");
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const displayName = String(body.display_name || "").trim();
    const role = String(body.role || "foreman");
    const siteIds = normalizeIdList(body.site_ids || body.site_id);
    const projectIds = normalizeIdList(body.project_ids);

    if (!email || !email.includes("@")) return response(400, { error: "Enter a valid email." });
    if (password.length < 8) return response(400, { error: "Password must be at least 8 characters." });
    if (!displayName) return response(400, { error: "Enter a display name." });
    if (!["admin", "foreman"].includes(role)) return response(400, { error: "Choose Admin or Foreman." });

    const authUser = await createAuthUser({ email, password, displayName });
    await upsertProfile({
      id: authUser.id,
      organization_id: requester.organization_id,
      display_name: displayName,
      role
    });

    if (role === "foreman") {
      const allowedProjectIds = await getAllowedProjectIds(projectIds, requester.organization_id);
      const allowedSiteIds = await getAllowedSiteIds(siteIds, requester.organization_id);
      const projectSiteIds = await getProjectSiteIds(allowedProjectIds, requester.organization_id);
      await assignSites(authUser.id, [...allowedSiteIds, ...projectSiteIds]);
      await assignProjects(authUser.id, allowedProjectIds);
    }

    return response(200, {
      ok: true,
      user: {
        id: authUser.id,
        email,
        display_name: displayName,
        role
      }
    });
  } catch (error) {
    console.error("create-user failed", error);
    return response(error.statusCode || 500, { error: error.message || "User could not be created." });
  }
};

async function createAuthUser({ email, password, displayName }) {
  const authResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: restHeaders(),
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: displayName
      }
    })
  });

  const payload = await safeJson(authResponse);
  if (!authResponse.ok) {
    throw httpError(authResponse.status, payload?.msg || payload?.message || payload?.error_description || "Auth user could not be created.");
  }
  return payload;
}

async function upsertProfile(profile) {
  const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?on_conflict=id`, {
    method: "POST",
    headers: {
      ...restHeaders(),
      Prefer: "resolution=merge-duplicates,return=minimal"
    },
    body: JSON.stringify(profile)
  });
  if (!profileResponse.ok) {
    const payload = await safeJson(profileResponse);
    throw httpError(profileResponse.status, payload?.message || "Profile could not be saved.");
  }
}

function normalizeIdList(value) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return [...new Set(values.map((item) => String(item || "").trim()).filter(Boolean))];
}

async function getAllowedProjectIds(projectIds, organizationId) {
  const uniqueProjectIds = [...new Set(projectIds.filter(Boolean))];
  if (!uniqueProjectIds.length || !organizationId) return [];
  const filter = uniqueProjectIds.map(encodeURIComponent).join(",");
  const response = await fetch(`${supabaseUrl}/rest/v1/projects?id=in.(${filter})&organization_id=eq.${encodeURIComponent(organizationId)}&select=id`, {
    headers: restHeaders()
  });
  const payload = await safeJson(response);
  if (!response.ok) throw httpError(response.status, payload?.message || "Projects could not be verified.");
  return (payload || []).map((project) => project.id).filter(Boolean);
}

async function getAllowedSiteIds(siteIds, organizationId) {
  const uniqueSiteIds = [...new Set(siteIds.filter(Boolean))];
  if (!uniqueSiteIds.length || !organizationId) return [];
  const filter = uniqueSiteIds.map(encodeURIComponent).join(",");
  const response = await fetch(`${supabaseUrl}/rest/v1/sites?id=in.(${filter})&organization_id=eq.${encodeURIComponent(organizationId)}&select=id`, {
    headers: restHeaders()
  });
  const payload = await safeJson(response);
  if (!response.ok) throw httpError(response.status, payload?.message || "Sites could not be verified.");
  return (payload || []).map((site) => site.id).filter(Boolean);
}

async function getProjectSiteIds(projectIds, organizationId) {
  const uniqueProjectIds = [...new Set(projectIds.filter(Boolean))];
  if (!uniqueProjectIds.length || !organizationId) return [];
  const filter = uniqueProjectIds.map(encodeURIComponent).join(",");
  const response = await fetch(`${supabaseUrl}/rest/v1/sites?project_id=in.(${filter})&organization_id=eq.${encodeURIComponent(organizationId)}&select=id`, {
    headers: restHeaders()
  });
  const payload = await safeJson(response);
  if (!response.ok) throw httpError(response.status, payload?.message || "Project sites could not be loaded.");
  return (payload || []).map((site) => site.id).filter(Boolean);
}

async function assignSites(userId, siteIds) {
  const uniqueSiteIds = [...new Set(siteIds.filter(Boolean))];
  if (!uniqueSiteIds.length) return;
  const accessResponse = await fetch(`${supabaseUrl}/rest/v1/user_site_access?on_conflict=user_id,site_id`, {
    method: "POST",
    headers: {
      ...restHeaders(),
      Prefer: "resolution=merge-duplicates,return=minimal"
    },
    body: JSON.stringify(uniqueSiteIds.map((siteId) => ({
      user_id: userId,
      site_id: siteId
    })))
  });
  if (!accessResponse.ok) {
    const payload = await safeJson(accessResponse);
    throw httpError(accessResponse.status, payload?.message || "Site access could not be assigned.");
  }
}

async function assignProjects(userId, projectIds) {
  const uniqueProjectIds = [...new Set(projectIds.filter(Boolean))];
  if (!uniqueProjectIds.length) return;
  const accessResponse = await fetch(`${supabaseUrl}/rest/v1/project_user_access?on_conflict=project_id,user_id`, {
    method: "POST",
    headers: {
      ...restHeaders(),
      Prefer: "resolution=merge-duplicates,return=minimal"
    },
    body: JSON.stringify(uniqueProjectIds.map((projectId) => ({
      project_id: projectId,
      user_id: userId
    })))
  });
  if (!accessResponse.ok) {
    const payload = await safeJson(accessResponse);
    throw httpError(accessResponse.status, payload?.message || "Project access could not be assigned.");
  }
}

function restHeaders(extra = {}) {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
    ...extra
  };
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function response(statusCode, body) {
  return {
    statusCode,
    headers,
    body: JSON.stringify(body)
  };
}
