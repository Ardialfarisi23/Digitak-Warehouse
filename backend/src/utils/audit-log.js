const prisma = require("../config/prisma");

const SENSITIVE_FIELDS = new Set([
  "password",
  "password_hash",
  "token",
  "secret",
  "api_key",
  "apikey",
  "access_token",
  "refresh_token",
  "reset_token",
]);

function toBigInt(value) {
  if (typeof value === "bigint") return value;
  if (value === null || value === undefined) return BigInt(0);
  return BigInt(value);
}

function serializeValue(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "bigint") return String(value);
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serializeValue);
  if (typeof value === "object") {
    if (typeof value.toNumber === "function") return value.toNumber();
    if (typeof value.toString === "function") return value.toString();
    return serializeObject(value);
  }
  return value;
}

function serializeObject(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const result = {};
  for (const [key, val] of Object.entries(obj)) {
    if (SENSITIVE_FIELDS.has(key)) continue;
    result[key] = serializeValue(val);
  }
  return result;
}

const VALID_AUDIT_AKSI = new Set([
  "create",
  "update",
  "delete",
  "approve",
  "receive_inbound",
  "approve_inbound",
  "approve_outbound",
  "confirm_distributed",
  "reject_inbound",
  "reject_outbound",
  "putaway",
  "retrieve",
  "create_inbound",
  "create_outbound",
  "start_delivery",
  "nonaktifkan_project",
  "aktifkan_project",
  "soft_delete",
  "restore",
  "cancel_draft",
  "report_arrival",
]);

async function createAuditLog(
  { entityType, entityId, aksi, actorId, dataSebelum = null, dataSesudah = null },
  client = prisma
) {
  if (!VALID_AUDIT_AKSI.has(aksi)) {
    throw new Error(`Invalid audit action: ${aksi}`);
  }

  await client.audit_log.create({
    data: {
      entity_type: String(entityType),
      entity_id: toBigInt(entityId),
      aksi: aksi,
      actor_id: toBigInt(actorId),
      data_sebelum: dataSebelum === null ? null : serializeObject(dataSebelum),
      data_sesudah: dataSesudah === null ? null : serializeObject(dataSesudah),
    },
  });
}

module.exports = { createAuditLog };
