const STRICT_EMPTY_MIMETYPE = true;

const ALLOWED_EXTENSIONS = [".xlsx", ".xls"];

const MAGIC_BYTES = {
  ".xlsx": Buffer.from([0x50, 0x4b, 0x03, 0x04]), // PK\x03\x04 (ZIP/OpenXML)
  ".xls": Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), // OLE2
};

function getExtension(filename) {
  const idx = filename.lastIndexOf(".");
  if (idx < 0 || idx === filename.length - 1) return "";
  return filename.slice(idx).toLowerCase();
}

function startsWith(buffer, prefix) {
  if (buffer.length < prefix.length) return false;
  for (let i = 0; i < prefix.length; i += 1) {
    if (buffer[i] !== prefix[i]) return false;
  }
  return true;
}

function hasNulByte(buffer, limit) {
  const end = Math.min(buffer.length, limit);
  for (let i = 0; i < end; i += 1) {
    if (buffer[i] === 0) return true;
  }
  return false;
}

// Validasi file upload sebelum parsing.
// Mengembalikan { ok: true } bila lolos, atau { ok: false, reason } bila ditolak.
function validateUploadFile({ originalname, mimetype, buffer }) {
  // Buffer kosong
  if (!buffer || buffer.length === 0) {
    return { ok: false, reason: "buffer_kosong" };
  }

  // Ekstensi harus ada di daftar yang diterima
  const ext = getExtension(originalname);
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { ok: false, reason: "ekstensi_tidak_diterima" };
  }

  // Mimetype kosong ditolak
  if (STRICT_EMPTY_MIMETYPE && (!mimetype || mimetype.trim() === "")) {
    return { ok: false, reason: "mimetype_kosong" };
  }

  // Magic bytes berdasarkan ekstensi
  const expected = MAGIC_BYTES[ext];
  if (expected && !startsWith(buffer, expected)) {
    return { ok: false, reason: "magic_bytes_tidak_cocok" };
  }

  return { ok: true };
}

module.exports = {
  STRICT_EMPTY_MIMETYPE,
  ALLOWED_EXTENSIONS,
  MAGIC_BYTES,
  validateUploadFile,
};
