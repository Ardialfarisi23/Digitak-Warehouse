const passwordHelper = require("../../shared/password");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const authRepository = require("./auth.repository");
const { toUserResponse } = require("./auth.mapper");
const AppError = require("../../shared/errors");
const { JWT_SECRET, JWT_REFRESH_SECRET, JWT_REFRESH_EXPIRES, JWT_ACCESS_EXPIRES } = require("../../config/env");
const prisma = require("../../config/prisma");
const { createAuditLog } = require("../../utils/audit-log");

// Helper to parse time string like "7d", "24h", "30m", "10s" to milliseconds
function parseTimeToMs(timeStr) {
  if (typeof timeStr !== "string") return 0;
  const match = timeStr.match(/^(\d+)(d|h|m|s)$/);
  if (!match) return 0;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case "d": return value * 24 * 60 * 60 * 1000;
    case "h": return value * 60 * 60 * 1000;
    case "m": return value * 60 * 1000;
    case "s": return value * 1000;
    default: return 0;
  }
}

// Helper to sanitize email for audit logging
// - lowercase
// - max 100 chars
// - simple email pattern check; if not match, return "[input bukan format email]"
function sanitizeEmailForAudit(email) {
  if (!email || typeof email !== "string") return "[input bukan format email]";
  const trimmed = email.trim().toLowerCase();
  if (trimmed.length > 100) return trimmed.slice(0, 100);
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(trimmed)) return "[input bukan format email]";
  return trimmed;
}

// Helper to generate access token from user object
function generateAccessToken(user) {
  return jwt.sign(
    {
      id: String(user.user_id),
      email: user.email,
      role: user.role,
      avatar_url: user.personils?.foto || null,
    },
    JWT_SECRET,
    {
      expiresIn: JWT_ACCESS_EXPIRES,
    }
  );
}

const login = async (email, password, ip, userAgent) => {
  let user = null;
  try {
    user = await authRepository.findByEmail(email);
  } catch (err) {
    console.error("Gagal mencari pengguna untuk audit login:", err.message);
  }

  if (!user) {
    // Log audit for login failed due to user not found with actor_id = null
    const sanitizedEmail = sanitizeEmailForAudit(email);
    try {
      await createAuditLog({
        entityType: "user_account",
        entityId: BigInt(0),
        aksi: "login_failed",
        actorId: null,
        dataSebelum: {
          ip: ip,
          userAgent: userAgent,
          reason: "email_not_found",
          email: sanitizedEmail,
        },
        dataSesudah: null,
      });
    } catch (auditErr) {
      console.error("Gagal membuat audit log untuk login failed (email not found):", auditErr.message);
    }
    throw new AppError("Email atau password salah.", 401);
  }

  if (!user.is_aktif) {
    // For inactive user, we can still log audit? The actor is the user (even though inactive).
    try {
      await createAuditLog({
        entityType: "user_account",
        entityId: BigInt(user.user_id),
        aksi: "login_failed",
        actorId: BigInt(user.user_id),
        dataSebelum: {
          ip: ip,
          userAgent: userAgent,
          reason: "account_inactive",
          email: email, // Note: we are logging the email attempted, but the task says not to log password, token, or refreshToken. Email is not sensitive? It is considered personal data, but the task says to log email yang dicoba for failure. We'll log it.
        },
        dataSesudah: null,
      });
    } catch (auditErr) {
      console.error("Gagal membuat audit log untuk login failed (account inactive):", auditErr.message);
    }
    throw new AppError("Akun telah dinonaktifkan.", 403);
  }

  const validPassword = await passwordHelper.compare(
    password,
    user.password_hash
  );

  if (!validPassword) {
    try {
      await createAuditLog({
        entityType: "user_account",
        entityId: BigInt(user.user_id),
        aksi: "login_failed",
        actorId: BigInt(user.user_id),
        dataSebelum: {
          ip: ip,
          userAgent: userAgent,
          reason: "wrong_password",
          email: email,
        },
        dataSesudah: null,
      });
    } catch (auditErr) {
      console.error("Gagal membuat audit log untuk login failed (wrong password):", auditErr.message);
    }
    throw new AppError("Email atau password salah.", 401);
  }

  const token = generateAccessToken(user);

  const refreshToken = jwt.sign(
    {
      id: String(user.user_id),
      email: user.email,
      type: "refresh",
    },
    JWT_REFRESH_SECRET,
    {
      expiresIn: JWT_REFRESH_EXPIRES,
    }
  );

  // Calculate expires_at from JWT_REFRESH_EXPIRES
  const expiresInMs = parseTimeToMs(JWT_REFRESH_EXPIRES);
  const expiresAt = new Date(Date.now() + expiresInMs);

  // Hash the refresh token for storage
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  // Store the refresh token in database
  await prisma.refresh_token.create({
    data: {
      id: crypto.randomBytes(16).toString("hex"),
      user_id: BigInt(user.user_id),
      token_hash: tokenHash,
      expires_at: expiresAt,
      ip: ip,
      user_agent: userAgent,
    },
  });

  // Delete expired refresh tokens for this user to keep table clean
  await prisma.refresh_token.deleteMany({
    where: {
      user_id: BigInt(user.user_id),
      OR: [
        { expires_at: { lt: new Date() } },
        { revoked_at: { not: null } },
      ],
    },
  });

  // Login success audit log
  try {
    await createAuditLog({
      entityType: "user_account",
      entityId: BigInt(user.user_id),
      aksi: "login_success",
      actorId: BigInt(user.user_id),
      dataSebelum: {
        ip: ip,
        userAgent: userAgent,
      },
      dataSesudah: null,
    });
  } catch (auditErr) {
    console.error("Gagal membuat audit log untuk login success:", auditErr.message);
  }

  return {
    user: toUserResponse(user),
    token,
    refreshToken,
  };
};

const changePassword = async (userId, currentPassword, newPassword, currentRefreshToken = null) => {
    const user = await authRepository.findByEmail(null, { userId });

    if (!user) {
        throw new AppError("Pengguna tidak ditemukan.", 404);
    }

    if (!user.is_aktif) {
        throw new AppError("Akun telah dinonaktifkan.", 403);
    }

    const validPassword = await passwordHelper.compare(
        currentPassword,
        user.password_hash
    );

    if (!validPassword) {
        throw new AppError("Password saat ini tidak sesuai.", 400);
    }

    const hashedNewPassword = await passwordHelper.hash(newPassword);

    await authRepository.updatePassword(user.user_id, hashedNewPassword);

    // Revoke other refresh tokens after password change
    try {
      const userIdBigInt = BigInt(user.user_id);
      let exceptTokenHash = null;

      if (currentRefreshToken && typeof currentRefreshToken === "string") {
        exceptTokenHash = crypto.createHash('sha256').update(currentRefreshToken).digest('hex');
      }

      if (exceptTokenHash) {
        // Revoke all active tokens for this user EXCEPT the one matching currentRefreshToken
        await prisma.refresh_token.updateMany({
          where: {
            user_id: userIdBigInt,
            revoked_at: null,
            token_hash: { not: exceptTokenHash },
          },
          data: {
            revoked_at: new Date(),
          },
        });
      } else {
        // No valid currentRefreshToken provided or it doesn't belong to this user -> revoke ALL active tokens
        await prisma.refresh_token.updateMany({
          where: {
            user_id: userIdBigInt,
            revoked_at: null,
          },
          data: {
            revoked_at: new Date(),
          },
        });
      }
    } catch (revokeErr) {
      console.error("[change-password] Gagal mencabut refresh token lain:", revokeErr.message);
      // Do not fail the password change if token revocation fails
    }

    await prisma.audit_log.create({
        data: {
            entity_type: "user_account",
            entity_id: BigInt(user.user_id),
            aksi: "update",
            actor_id: BigInt(user.user_id),
            data_sebelum: { must_change_password: true },
            data_sesudah: { must_change_password: false },
        },
    });

    return {
        message: "Password berhasil diperbarui.",
    };
};

const refreshAccessToken = async (refreshToken) => {
  if (!refreshToken) {
    throw new AppError("Refresh token tidak ditemukan.", 401);
  }

  // Hash the incoming token to compare with stored hash
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  // Find a valid, non-revoked, non-expired token
  const stored = await prisma.refresh_token.findFirst({
    where: {
      token_hash: tokenHash,
      revoked_at: null,
      expires_at: { gt: new Date() },
    },
  });

  if (!stored) {
    throw new AppError("Refresh token tidak valid.", 401);
  }

  // Fetch the user from DB to get the latest data (role, aktif status, etc.)
  const user = await authRepository.findByEmail(null, { userId: stored.user_id });

  if (!user) {
    // User not found, revoke the token
    await prisma.refresh_token.updateMany({
      where: {
        token_hash: tokenHash,
        revoked_at: null,
      },
      data: {
        revoked_at: new Date(),
      },
    });
    throw new AppError("Refresh token tidak valid.", 401);
  }

  if (!user.is_aktif) {
    // User is not active, revoke the token
    await prisma.refresh_token.updateMany({
      where: {
        token_hash: tokenHash,
        revoked_at: null,
      },
      data: {
        revoked_at: new Date(),
      },
    });
    throw new AppError("Akun telah dinonaktifkan.", 403);
  }

  // Generate new access token using the user data
  const token = generateAccessToken(user);

  return {
    token: token,
  };
};

const logout = async ({ refreshToken, userId } = {}) => {
  // If a refresh token is provided, revoke that specific token.
  if (refreshToken) {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await prisma.refresh_token.updateMany({
      where: {
        token_hash: tokenHash,
        revoked_at: null,
      },
      data: {
        revoked_at: new Date(),
      },
    });
  } 
  // If no refresh token but we have a userId (from access token), revoke all active refresh tokens for that user.
  else if (userId) {
    await prisma.refresh_token.updateMany({
      where: {
        user_id: BigInt(userId),
        revoked_at: null,
      },
      data: {
        revoked_at: new Date(),
      },
    });
  }
  // If neither is provided, do nothing (but this should not happen in normal flow).

  return {
    message: "Logout berhasil.",
  };
};

const forgotPassword = async (email) => {
    return {
        message: "Jika akun Anda terdaftar, silakan hubungi admin untuk mendapatkan link reset password."
    };
}
const resetPassword = async (email, token, newPassword) => {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const resetRecord = await authRepository.findPasswordResetToken(hashedToken, email);

    if (!resetRecord) {
        throw new AppError("Token reset tidak valid atau sudah kadaluarsa.", 400);
    }

    const user = await authRepository.findByEmail(email);

    if (!user) {
        throw new AppError("Pengguna tidak ditemukan.", 404);
    }

    const hashedPassword = await passwordHelper.hash(newPassword);

    await authRepository.updatePassword(user.user_id, hashedPassword);

    // Delete the used reset token
    await authRepository.deletePasswordResetToken(hashedToken);

    // Delete all other reset tokens for the same user (to invalidate any others)
    await prisma.password_reset_token.deleteMany({
      where: { email: user.email }
    });

    // Revoke all active refresh tokens for the user (to invalidate existing sessions)
    await prisma.refresh_token.updateMany({
      where: {
        user_id: BigInt(user.user_id),
        revoked_at: null,
      },
      data: {
        revoked_at: new Date(),
      },
    });

    return {
        message: "Kata sandi berhasil diperbarui.",
    };
};

module.exports = {
    login,
    changePassword,
    logout,
    refreshAccessToken,
    forgotPassword,
    resetPassword,
    sanitizeEmailForAudit,
    parseTimeToMs,
};



