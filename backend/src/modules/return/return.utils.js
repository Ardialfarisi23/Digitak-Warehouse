const { Prisma } = require("@prisma/client");

function getBusinessDate(dateTime) {
  const d = new Date(dateTime);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid dateTime for business date extraction: ${dateTime}`);
  }

  const options = {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  };

  const parts = new Intl.DateTimeFormat("en-CA", options).formatToParts(d);
  const year = parts.find((p) => p.type === "year").value;
  const month = parts.find((p) => p.type === "month").value;
  const day = parts.find((p) => p.type === "day").value;

  return `${year}-${month}-${day}`;
}

function toPrismaDecimal(value) {
  if (value instanceof Prisma.Decimal) {
    return value;
  }
  if (typeof value === "number") {
    return new Prisma.Decimal(value);
  }
  if (typeof value === "string") {
    return new Prisma.Decimal(value);
  }
  return new Prisma.Decimal(0);
}

const MAX_RETRIES = 3;
const RETRY_BACKOFF_MS = [100, 200, 400];

function isRetryablePrismaError(err) {
  if (!err) return false;
  if (err.code === "P2034") return true;
  const message = String(err.message || "");
  if (message.includes("40001")) return true;
  if (message.includes("Transaction failed due to a write conflict or a deadlock")) return true;
  return false;
}

async function withSerializableRetry(fn, maxRetries = MAX_RETRIES, backoffMs = RETRY_BACKOFF_MS) {
  let lastErr;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const retryable = isRetryablePrismaError(err);
      if (!retryable || attempt === maxRetries) {
        throw err;
      }
      const delay = backoffMs[attempt - 1] ?? 100;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastErr;
}

module.exports = {
  getBusinessDate,
  toPrismaDecimal,
  withSerializableRetry,
  MAX_RETRIES,
  RETRY_BACKOFF_MS,
};
