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
  if (!["GET", "POST", "PUT", "DELETE"].includes(event.httpMethod)) {
    return response(405, { error: "Method not allowed" });
  }

  if (!supabaseUrl || !serviceKey) {
    return response(500, { error: "Supabase service key is not configured." });
  }

  try {
    const requesterContext = await getRequestContext(event);
    const requester = requesterContext?.profile;
    if (!requester) return response(401, { error: "Your admin session is no longer active. Sign in again." });
    if (requester.role !== "admin") {
      return response(403, { error: `Only admins can manage users. This login is currently marked as ${requester.role || "no role"}.` });
    }

    if (event.httpMethod === "GET") {
      return response(200, { users: await listOrganizationUsers(requester.organization_id) });
    }

    const body = JSON.parse(event.body || "{}");
    const userId = String(body.id || "").trim();
    if (!userId) return response(400, { error: "User id is required." });

    if (event.httpMethod === "POST") {
      if (body.action === "revokeSessions") {
        await assertSameOrganization(userId, requester.organization_id);
        await revokeUserSessions(userId);
        return response(200, { ok: true });
      }
      if (body.action === "setActive") {
        const isActive = Boolean(body.is_active);
        if (!isActive && userId === requester.id) return response(400, { error: "You cannot pause the admin account you are signed in with." });
        await assertSameOrganization(userId, requester.organization_id);
        await updateProfileAccess(userId, {
          is_active: isActive,
          ...(isActive ? {} : { sessions_valid_after: new Date(Date.now() + 2000).toISOString() })
        });
        if (!isActive) await revokeUserSessions(userId);
        return response(200, { ok: true });
      }
      return response(400, { error: "Unknown user action." });
    }

    if (event.httpMethod === "DELETE") {
      if (userId === requester.id) return response(400, { error: "You cannot delete the admin account you are signed in with." });
      await assertSameOrganization(userId, requester.organization_id);
      await deleteAuthUser(userId);
      return response(200, { ok: true });
    }

    const displayName = String(body.display_name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const role = String(body.role || "foreman");
    const password = String(body.password || "");
    const siteIds = normalizeIdList(body.site_ids);
    const projectIds = normalizeIdList(body.project_ids);

    if (!displayName) return response(400, { error: "Enter a display name." });
    if (!email || !email.includes("@")) return response(400, { error: "Enter a valid email." });
    if (!["admin", "foreman"].includes(role)) return response(400, { error: "Choose Admin or Foreman." });
    if (password && password.length < 8) return response(400, { error: "Password must be at least 8 characters." });

    await assertSameOrganization(userId, requester.organization_id);
    await updateAuthUser(userId, { email, password, displayName });
    await upsertProfile({
      id: userId,
      organization_id: requester.organization_id,
      display_name: displayName,
      role
    });
    await replaceUserAccess(userId, role, siteIds, projectIds, requester.organization_id);

    return response(200, { ok: true });
  } catch (error) {
    console.error("manage-users failed", error);
    return response(error.statusCode || 500, { error: error.message || "User could not be managed." });
  }
};

async function listOrganizationUsers(organizationId) {
  const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?organization_id=eq.${encodeURIComponent(organizationId)}&select=id`, {
    headers: restHeaders()
  });
  const profiles = await safeJson(profileResponse);
  if (!profileResponse.ok) throw httpError(profileResponse.status, profiles?.message || "Organization users could not be loaded.");

  const users = await Promise.all((profiles || []).map(async (profile) => {
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(profile.id)}`, {
      headers: restHeaders()
    });
    if (!authResponse.ok) return { id: profile.id, email: "" };
    const user = await safeJson(authResponse);
    return { id: profile.id, email: user?.email || "" };
  }));
  return users;
}

async function updateProfileAccess(userId, values) {
  const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
    method: "PATCH",
    headers: restHeaders({ Prefer: "return=minimal" }),
    body: JSON.stringify(values)
  });
  if (!profileResponse.ok) {
    const payload = await safeJson(profileResponse);
    throw httpError(profileResponse.status, payload?.message || "User access could not be updated.");
  }
}

async function revokeUserSessions(userId) {
  const rpcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/revoke_user_sessions`, {
    method: "POST",
    headers: restHeaders({ Prefer: "return=minimal" }),
    body: JSON.stringify({ target_user_id: userId })
  });
  if (!rpcResponse.ok) {
    const payload = await safeJson(rpcResponse);
    throw httpError(rpcResponse.status, payload?.message || "User sessions could not be revoked.");
  }
}

async function updateAuthUser(userId, { email, password, displayName }) {
  const body = {
    email,
    user_metadata: {
      display_name: displayName
    }
  };
  if (password) body.password = password;

  const authResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: "PUT",
    headers: restHeaders(),
    body: JSON.stringify(body)
  });
  const payload = await safeJson(authResponse);
  if (!authResponse.ok) {
    throw httpError(authResponse.status, payload?.msg || payload?.message || payload?.error_description || "Auth user could not be updated.");
  }
}

async function deleteAuthUser(userId) {
  const authResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: "DELETE",
    headers: restHeaders()
  });
  const payload = await safeJson(authResponse);
  if (!authResponse.ok) {
    throw httpError(authResponse.status, payload?.msg || payload?.message || "Auth user could not be deleted.");
  }
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

async function assertSameOrganization(userId, organizationId) {
  const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=id,organization_id`, {
    headers: restHeaders({ Accept: "application/vnd.pgrst.object+json" })
  });
  const profile = await safeJson(profileResponse);
  if (!profileResponse.ok) throw httpError(profileResponse.status, profile?.message || "User profile could not be verified.");
  if (profile.organization_id !== organizationId) throw httpError(403, "This user belongs to a different organization.");
}

async function replaceUserAccess(userId, role, siteIds, projectIds, organizationId) {
  await deleteUserAccess("user_site_access", userId);
  await deleteUserAccess("project_user_access", userId);
  if (role !== "foreman") return;

  const allowedProjectIds = await getAllowedProjectIds(projectIds, organizationId);
  const allowedSiteIds = await getAllowedSiteIds(siteIds, organizationId);
  const projectSiteIds = await getProjectSiteIds(allowedProjectIds, organizationId);
  await assignSites(userId, [...allowedSiteIds, ...projectSiteIds]);
  await assignProjects(userId, allowedProjectIds);
}

async function deleteUserAccess(table, userId) {
  const accessResponse = await fetch(`${supabaseUrl}/rest/v1/${table}?user_id=eq.${encodeURIComponent(userId)}`, {
    method: "DELETE",
    headers: restHeaders()
  });
  if (!accessResponse.ok) {
    const payload = await safeJson(accessResponse);
    throw httpError(accessResponse.status, payload?.message || "User access could not be cleared.");
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
