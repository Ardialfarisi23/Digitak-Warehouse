const { z } = require("zod");
const { strongPasswordSchema } = require("../../validators/password.validator");

const loginSchema = z.object({
    email: z
        .string()
        .nonempty("Email wajib diisi")
        .email("Format email tidak valid"),
    password: z.string().nonempty("Password wajib diisi"),
});

const changePasswordSchema = z.object({
    currentPassword: z
        .string()
        .nonempty("Password saat ini wajib diisi")
        .min(6, "Password minimal 6 karakter"),
    newPassword: strongPasswordSchema,
    refreshToken: z.string().optional(),
});

const resetPasswordSchema = z.object({
    email: z
        .string()
        .nonempty("Email wajib diisi")
        .email("Format email tidak valid"),
    token: z.string().nonempty("Token wajib diisi"),
    newPassword: strongPasswordSchema,
});

module.exports = {
    loginSchema,
    changePasswordSchema,
    resetPasswordSchema
};
