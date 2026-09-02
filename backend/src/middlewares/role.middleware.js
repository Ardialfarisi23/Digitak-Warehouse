const AppError = require("../shared/errors");

const ROLE_ALIASES = {
  admin_general: "ADMIN",
  supervisor: "SUPERVISOR",
  staf_gudang: "STAFF",
};

const normalizeRole = (role) => ROLE_ALIASES[role] || role;

const authorize = (...roles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError("Unauthorized.", 401);
      }

      const userRole = normalizeRole(req.user.role);

      // DEBUG SEMENTARA — hapus setelah masalah 403 ketemu akar masalahnya
      console.log("[DEBUG authorize]", req.method, req.originalUrl);
      console.log("[DEBUG authorize] req.user lengkap =", JSON.stringify(req.user));
      console.log("[DEBUG authorize] req.user.role mentah =", JSON.stringify(req.user.role));
      console.log("[DEBUG authorize] userRole setelah normalize =", JSON.stringify(userRole));
      console.log("[DEBUG authorize] roles yang diizinkan route ini =", roles);

      if (!roles.includes(userRole)) {
        throw new AppError("Anda tidak memiliki hak akses.", 403);
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = authorize;
