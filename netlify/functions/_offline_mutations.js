function getServiceKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_DEFAULT_SECRET_KEY || "";
}

async function readError(response, fallback) {
  try {
    const body = await response.json();
    return body?.message || body?.error || body?.details || fallback;
  } catch {
    return fallback;
  }
}

async function applyPunchItemPatch({ organizationId, mutationId, itemId, patch, baseUpdatedAt, clientUpdatedAt }) {
  const url = process.env.SUPABASE_URL || "";
  const serviceKey = getServiceKey();
  if (!url || !serviceKey || !organizationId) throw Object.assign(new Error("Supabase sync is not configured."), { statusCode: 503 });
  if (!mutationId) throw Object.assign(new Error("Missing mutation id."), { statusCode: 400 });

  const response = await fetch(`${url}/rest/v1/rpc/apply_punch_item_patch`, {
    method: "POST",
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      p_organization_id: organizationId,
      p_mutation_id: mutationId,
      p_item_id: itemId,
      p_patch: patch,
      p_base_updated_at: baseUpdatedAt || null,
      p_client_updated_at: clientUpdatedAt || null
    })
  });
  if (!response.ok) {
    const message = await readError(response, `Supabase update failed with status ${response.status}.`);
    const statusCode = /SYNC_CONFLICT/i.test(message) ? 409 : response.status >= 500 ? 503 : response.status;
    throw Object.assign(new Error(message), { statusCode });
  }
  return response.json();
}

async function upsertItemPhoto({ id, organizationId, itemId, storagePath, fileName, contentType, completionProof }) {
  const url = process.env.SUPABASE_URL || "";
  const serviceKey = getServiceKey();
  if (!url || !serviceKey || !organizationId) throw Object.assign(new Error("Supabase photo sync is not configured."), { statusCode: 503 });
  const response = await fetch(`${url}/rest/v1/item_photos?on_conflict=id`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal"
    },
    body: JSON.stringify({
      id,
      organization_id: organizationId,
      item_id: itemId,
      storage_path: storagePath,
      file_name: fileName,
      content_type: contentType,
      completion_proof: Boolean(completionProof)
    })
  });
  if (!response.ok) throw Object.assign(new Error(await readError(response, "Photo details could not be saved.")), { statusCode: response.status >= 500 ? 503 : response.status });
}

module.exports = { applyPunchItemPatch, upsertItemPhoto };
