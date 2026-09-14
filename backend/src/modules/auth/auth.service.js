const passwordHelper = require("../../shared/password");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const authRepository = require("./auth.repository");
const { toUserResponse } = require("./auth.mapper");
const AppError = require("../../shared/errors");
const { JWT_SECRET, JWT_REFRESH_SECRET, JWT_REFRESH_EXPIRES } = require("../../config/env");

const refreshTokenStore = new Map();

const login = async (email, password) => {
    const user = await authRepository.findByEmail(email);

    if (!user) {
        throw new AppError("Email atau password salah.", 401);
    }

    if (!user.is_aktif) {
        throw new AppError("Akun telah dinonaktifkan.", 403);
    }

    const validPassword = await passwordHelper.compare(
        password,
        user.password_hash
    );

    if (!validPassword) {
        throw new AppError("Email atau password salah.", 401);
    }

    const token = jwt.sign(
        {
            id: String(user.user_id),
            email: user.email,
            role: user.role,
            avatar_url: user.personils?.foto || null,
        },
        JWT_SECRET,
        {
            expiresIn: "24h",
        }
    );

    const refreshToken = jwt.sign(
        {
            id: String(user.user_id),
            email: user.email,
            type: "refresh",
        },
        JWT_REFRESH_SECRET,
        {
            expiresIn: JWT_REFRESH_EXPIRES || "7d",
        }
    );

    refreshTokenStore.set(refreshToken, {
        userId: String(user.user_id),
        email: user.email,
        createdAt: new Date(),
    });

    return {
        user: toUserResponse(user),
        token,
        refreshToken,
    };
};

const changePassword = async (userId, currentPassword, newPassword) => {
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
        throw new AppError("Password saat ini tidak sesuai.", 401);
    }

    const hashedNewPassword = await passwordHelper.hash(newPassword);

    await authRepository.updatePassword(user.user_id, hashedNewPassword);

    return {
        message: "Password berhasil diperbarui.",
    };
};

const refreshAccessToken = async (refreshToken) => {
    if (!refreshToken) {
        throw new AppError("Refresh token tidak ditemukan.", 401);
    }

    const stored = refreshTokenStore.get(refreshToken);
    if (!stored) {
        throw new AppError("Refresh token tidak valid.", 401);
    }

    try {
        const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

        if (decoded.type !== "refresh") {
            throw new AppError("Refresh token tidak valid.", 401);
        }

        const newAccessToken = jwt.sign(
            {
                id: decoded.id,
                email: decoded.email,
                role: decoded.role,
            },
            JWT_SECRET,
            {
                expiresIn: "24h",
            }
        );

        return {
            token: newAccessToken,
        };
    } catch (err) {
        refreshTokenStore.delete(refreshToken);
        throw new AppError("Refresh token expired atau tidak valid.", 401);
    }
};

const logout = async () => {
    return {
        message: "Logout berhasil."
    };
};

const forgotPassword = async (email) => {
    const user = await authRepository.findByEmail(email);

    if (!user) {
        throw new AppError("Email tidak terdaftar.", 404);
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await authRepository.createPasswordResetToken({
        id: crypto.randomBytes(16).toString("hex"),
        email: user.email,
        token,
        expires,
    });

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;

    return {
        message: "Tautan reset kata sandi berhasil dibuat.",
        resetUrl,
    };
};

const resetPassword = async (email, token, newPassword) => {
    const resetRecord = await authRepository.findPasswordResetToken(token, email);

    if (!resetRecord) {
        throw new AppError("Token reset tidak valid atau sudah kadaluarsa.", 400);
    }

    const user = await authRepository.findByEmail(email);

    if (!user) {
        throw new AppError("Pengguna tidak ditemukan.", 404);
    }

    const hashedPassword = await passwordHelper.hash(newPassword);

    await authRepository.updatePassword(user.user_id, hashedPassword);
    await authRepository.deletePasswordResetToken(token);

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
};
