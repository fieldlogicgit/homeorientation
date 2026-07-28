const allowedPhotoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxPhotoBytes = 5 * 1024 * 1024;

function detectImageType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return "";
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return "";
}

function validatePhotoBuffer(buffer, claimedType = "") {
  if (!Buffer.isBuffer(buffer) || !buffer.length) throw new Error("Photo is empty.");
  if (buffer.length > maxPhotoBytes) throw new Error("Photo is larger than 5 MB.");
  const detectedType = detectImageType(buffer);
  if (!allowedPhotoTypes.has(detectedType)) throw new Error("Choose a valid JPG, PNG, or WebP photo.");
  if (claimedType && claimedType !== detectedType) throw new Error("The photo contents do not match its file type.");
  return detectedType;
}

function safeFileName(value, fallback = "upload") {
  const name = String(value || fallback).replace(/[\\/\0-\x1f\x7f]+/g, "-").replace(/\.{2,}/g, ".").slice(0, 180);
  return name || fallback;
}

module.exports = { maxPhotoBytes, safeFileName, validatePhotoBuffer };

