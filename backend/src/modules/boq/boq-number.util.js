const AppError = require("../../shared/errors");

const JAKARTA_TZ = "Asia/Jakarta";

const pad2 = (n) => String(n).padStart(2, "0");

const getJakartaDateParts = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: JAKARTA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  return parts.split("-"); // [YYYY, MM, DD]
};

const getJakartaYear = (date = new Date()) => Number(getJakartaDateParts(date)[0]);

const formatBoqNumber = (date, seq) => {
  const [y, m, d] = getJakartaDateParts(date);
  return `BOQ-${y}/${m}/${d}-${String(seq).padStart(4, "0")}`;
};

const parseBoqSequence = (boqNumber) => {
  if (!boqNumber) return null;
  const str = String(boqNumber);
  const lastDash = str.lastIndexOf("-");
  if (lastDash < 0) return null;
  const n = parseInt(str.slice(lastDash + 1), 10);
  return Number.isNaN(n) ? null : n;
};

const isBoqNumberUniqueViolation = (err) => {
  if (err?.code !== "P2002") return false;
  const target = err?.meta?.target;
  return (Array.isArray(target) && target.includes("boq_number")) || target === "boq_number";
};

const withBoqNumberRetry = async (generateFn, createFn, maxRetry = 3) => {
  let lastErr;
  for (let attempt = 1; attempt <= maxRetry; attempt++) {
    const boqNumber = await generateFn();
    try {
      return await createFn(boqNumber);
    } catch (err) {
      lastErr = err;
      if (isBoqNumberUniqueViolation(err) && attempt < maxRetry) {
        continue;
      }
      if (isBoqNumberUniqueViolation(err)) {
        const appErr = new AppError(
          "Gagal membuat nomor BOQ karena permintaan bersamaan, silakan coba lagi.",
          409
        );
        appErr.cause = lastErr;
        throw appErr;
      }
      throw err;
    }
  }
  const appErr = new AppError(
    "Gagal membuat nomor BOQ karena permintaan bersamaan, silakan coba lagi.",
    409
  );
  appErr.cause = lastErr;
  throw appErr;
};

module.exports = { getJakartaYear, formatBoqNumber, parseBoqSequence, withBoqNumberRetry, isBoqNumberUniqueViolation };