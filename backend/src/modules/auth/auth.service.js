const passwordHelper = require("../../shared/password");
const jwt = require("jsonwebtoken");

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

module.exports = {
    login,
    logout,
    refreshAccessToken,
};
