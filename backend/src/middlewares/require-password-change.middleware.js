const prisma = require("../config/prisma");
const AppError = require("../shared/errors");

const EXCLUDED_PATHS = [
  "/api/auth/change-password",
  "/api/auth/logout",
  "/api/auth/me",
  "/api/auth/refresh",
];

const requirePasswordChange = async (req, res, next) => {
  if (!req.user) {
    return next();
  }

  const path = req.originalUrl.split("?")[0];

  if (EXCLUDED_PATHS.some((excluded) => path === excluded || path.startsWith(excluded + "/"))) {
    return next();
  }

  try {
    const user = await prisma.user_account.findFirst({
      where: { user_id: BigInt(req.user.id) },
      select: { must_change_password: true },
    });

    if (!user) {
      return next();
    }

    if (user.must_change_password) {
      return res.status(403).json({
        success: false,
        message: "Anda wajib mengganti password sebelum melanjutkan.",
        code: "MUST_CHANGE_PASSWORD",
      });
    }

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = requirePasswordChange;
