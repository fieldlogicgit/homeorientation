const photoBucket = "item-photos";
const { safeFileName, validatePhotoBuffer } = require("./_upload_security");

function getSupabaseServiceKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_DEFAULT_SECRET_KEY ||
    ""
  );
}

function getSupabaseConfig() {
  return {
    url: process.env.SUPABASE_URL || "",
    serviceKey: getSupabaseServiceKey()
  };
}

function cleanPathPart(value, fallback = "file") {
  return String(value || fallback)
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || fallback;
}

function encodeStoragePath(path) {
  return String(path || "")
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
}

function buildPhotoStoragePath({ organizationId, itemId, photoId, fileName }) {
  const securedName = safeFileName(fileName, "photo.jpg");
  const extension = cleanPathPart(String(securedName).split(".").pop() || "jpg", "jpg").toLowerCase();
  const safeName = cleanPathPart(String(securedName).replace(/\.[^.]+$/, ""), "photo");
  return [
    cleanPathPart(organizationId, "organization"),
    cleanPathPart(itemId, "item"),
    `${cleanPathPart(photoId, "photo")}-${safeName}.${extension}`
  ].join("/");
}

async function uploadPhotoToSupabaseStorage({ organizationId, itemId, photoId, fileName, contentType, buffer, upsert = false }) {
  const { url, serviceKey } = getSupabaseConfig();
  if (!url || !serviceKey) throw new Error("Supabase storage is not configured.");
  if (!organizationId || !itemId) throw new Error("Photo upload needs an organization and item.");

  const verifiedType = validatePhotoBuffer(buffer, contentType || "");
  const storagePath = buildPhotoStoragePath({ organizationId, itemId, photoId, fileName });
  const response = await fetch(`${url}/storage/v1/object/${photoBucket}/${encodeStoragePath(storagePath)}`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": verifiedType,
      "x-upsert": upsert ? "true" : "false"
    },
    body: buffer
  });

  if (!response.ok) {
    let message = `Supabase photo upload failed with status ${response.status}.`;
    try {
      const details = await response.json();
      if (details?.message) message = details.message;
      if (details?.error) message = details.error;
    } catch {
      // Keep the status-based message.
    }
    throw new Error(message);
  }

  return storagePath;
}

async function downloadPhotoFromSupabaseStorage(storagePath) {
  const { url, serviceKey } = getSupabaseConfig();
  if (!url || !serviceKey || !storagePath) return null;

  const response = await fetch(`${url}/storage/v1/object/${photoBucket}/${encodeStoragePath(storagePath)}`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`
    }
  });

  if (!response.ok) return null;

  return {
    contentType: response.headers.get("content-type") || "image/jpeg",
    buffer: Buffer.from(await response.arrayBuffer())
  };
}

async function createSignedPhotoUrl(storagePath, expiresIn = 900) {
  const { url, serviceKey } = getSupabaseConfig();
  if (!url || !serviceKey || !storagePath) return "";

  const response = await fetch(`${url}/storage/v1/object/sign/${photoBucket}/${encodeStoragePath(storagePath)}`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ expiresIn })
  });
  if (!response.ok) return "";

  const result = await response.json();
  const signedPath = result.signedURL || result.signedUrl || "";
  if (!signedPath) return "";
  if (/^https?:\/\//i.test(signedPath)) return signedPath;
  if (signedPath.startsWith("/storage/v1/")) return `${url}${signedPath}`;
  return `${url}/storage/v1${signedPath.startsWith("/") ? "" : "/"}${signedPath}`;
}

module.exports = {
  createSignedPhotoUrl,
  downloadPhotoFromSupabaseStorage,
  photoBucket,
  uploadPhotoToSupabaseStorage
};
