const AppError = require("../shared/errors");
const prisma = require("../config/prisma");

const attachGudangScope = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError("Unauthorized.", 401);
    }

    const role = req.user.role;

    if (role === "admin_general" || role === "supervisor") {
      req.gudangScope = null;
      return next();
    }

    if (role === "staf_gudang") {
      const personil = await prisma.personil.findUnique({
        where: { user_id: BigInt(req.user.id) },
        select: { gudang_id: true },
      });

      const gudangId = personil?.gudang_id ? Number(personil.gudang_id) : null;

      if (gudangId === null) {
        throw new AppError(
          "Anda belum ditugaskan ke gudang manapun. Hubungi Administrator untuk menetapkan gudang penugasan.",
          403
        );
      }

      req.gudangScope = gudangId;
      return next();
    }

    req.gudangScope = null;
    next();
  } catch (err) {
    next(err);
  }
};

const applyGudangScope = (whereClause, gudangScope, fieldName = "gudang_id") => {
  if (!whereClause || typeof whereClause !== "object") {
    return whereClause;
  }

  if (gudangScope === null || gudangScope === undefined) {
    return whereClause;
  }

  if (typeof gudangScope === "number" && Number.isInteger(gudangScope)) {
    return {
      ...whereClause,
      [fieldName]: gudangScope,
    };
  }

  return whereClause;
};

module.exports = {
  attachGudangScope,
  applyGudangScope,
};
