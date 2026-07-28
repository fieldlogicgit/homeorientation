(function initPunchLogicUploadSecurity(global) {
  const maxDocumentBytes = 25 * 1024 * 1024;
  const maxSourcePhotoBytes = 25 * 1024 * 1024;
  const documentTypes = {
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    csv: "text/csv",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp"
  };

  function extensionOf(file) {
    return String(file?.name || "").split(".").pop().toLowerCase();
  }

  function safeFileName(value, fallback = "upload") {
    const name = String(value || fallback)
      .replace(/[\\/\0-\x1f\x7f]+/g, "-")
      .replace(/\.{2,}/g, ".")
      .slice(0, 180);
    return name || fallback;
  }

  async function readHeader(file, length = 32) {
    return new Uint8Array(await file.slice(0, length).arrayBuffer());
  }

  function ascii(bytes, start, end) {
    return String.fromCharCode(...bytes.slice(start, end));
  }

  function hasBytes(bytes, expected, offset = 0) {
    return expected.every((value, index) => bytes[offset + index] === value);
  }

  function detectBinaryType(bytes) {
    if (hasBytes(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf";
    if (hasBytes(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
    if (hasBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
    if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") return "image/webp";
    if (hasBytes(bytes, [0x50, 0x4b, 0x03, 0x04]) || hasBytes(bytes, [0x50, 0x4b, 0x05, 0x06])) return "application/zip";
    return "";
  }

  async function validateDocument(file) {
    if (!file?.name || !file.size) throw new Error("Choose a document to upload.");
    if (file.size > maxDocumentBytes) throw new Error("This document is larger than 25 MB.");
    const extension = extensionOf(file);
    const expectedType = documentTypes[extension];
    if (!expectedType) throw new Error("Choose a PDF, DOCX, XLSX, CSV, JPG, PNG, or WebP document.");

    const bytes = await readHeader(file, extension === "csv" ? 4096 : 32);
    const detected = detectBinaryType(bytes);
    if (["docx", "xlsx"].includes(extension) && detected !== "application/zip") {
      throw new Error("The Office document contents do not match its file extension.");
    }
    if (extension === "csv") {
      if (bytes.includes(0)) throw new Error("The CSV contains binary data and cannot be uploaded.");
    } else if (!["docx", "xlsx"].includes(extension) && detected !== expectedType) {
      throw new Error("The document contents do not match its file extension.");
    }
    if (file.type && ![expectedType, "application/octet-stream", "application/zip", "application/vnd.ms-excel"].includes(file.type.toLowerCase())) {
      throw new Error("The document type reported by this device does not match the selected file.");
    }
    return { contentType: expectedType, safeName: safeFileName(file.name) };
  }

  async function validateSourcePhoto(file) {
    if (!file?.name || !file.size) throw new Error("Choose a photo.");
    if (file.size > maxSourcePhotoBytes) throw new Error("This photo is larger than 25 MB.");
    const bytes = await readHeader(file, 32);
    const detected = detectBinaryType(bytes);
    const heifBrand = ascii(bytes, 4, 12).toLowerCase();
    const isHeif = heifBrand.includes("ftyp") && ["heic", "heix", "hevc", "mif1"].some((brand) => heifBrand.includes(brand));
    if (!["image/jpeg", "image/png", "image/webp"].includes(detected) && !isHeif) {
      throw new Error("Choose a valid JPG, PNG, WebP, or HEIC photo.");
    }
    return detected || "image/heic";
  }

  global.PUNCH_LOGIC_UPLOAD_SECURITY = {
    documentTypes: new Set(Object.values(documentTypes)),
    maxDocumentBytes,
    safeFileName,
    validateDocument,
    validateSourcePhoto
  };
})(window);

