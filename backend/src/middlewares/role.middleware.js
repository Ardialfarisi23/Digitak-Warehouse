const AppError = require("../shared/errors");
const prisma = require("../config/prisma");

const ROLE_ALIASES = {
  admin_general: "ADMIN",
  supervisor: "SUPERVISOR",
  staf_gudang: "STAFF",
};

const normalizeRole = (role) => ROLE_ALIASES[role] || role;

const authorize = (...roles) => {
  const middleware = (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError("Unauthorized.", 401);
      }

      const userRole = normalizeRole(req.user.role);

      if (!roles.includes(userRole)) {
        const actorId = req.user.id || req.user.user_id;
        if (actorId) {
          prisma.audit_log
            .create({
              data: {
                entity_type: "access_attempt",
                entity_id: BigInt(actorId),
                aksi: "update",
                actor_id: BigInt(actorId),
                data_sebelum: null,
                data_sesudah: {
                  method: req.method,
                  url: req.originalUrl,
                  user_role: req.user.role,
                  required_roles: roles,
                  reason: "role_mismatch",
                },
              },
            })
            .catch(() => {});
        }

        throw new AppError("Anda tidak memiliki hak akses.", 403);
      }

      next();
    } catch (err) {
      next(err);
    }
  };

  // Metadata introspektif: dipakai unit test untuk memverifikasi role yang
  // diizinkan pada tiap endpoint (tanpa harus menjalankan server).
  middleware.allowedRoles = roles;

  return middleware;
};

module.exports = authorize;
