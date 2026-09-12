const { z } = require("zod");

const loginSchema = z.object({
    email: z
        .string({
            required_error: "Email wajib diisi"
        })
        .email("Format email tidak valid"),
    password: z
        .string({
            required_error: "Password wajib diisi"
        })
        .min(6, "Password minimal 6 karakter")
});

const changePasswordSchema = z.object({
    currentPassword: z
        .string({
            required_error: "Password saat ini wajib diisi"
        })
        .min(6, "Password minimal 6 karakter"),
    newPassword: z
        .string({
            required_error: "Password baru wajib diisi"
        })
        .min(8, "Password minimal 8 karakter")
        .regex(/[A-Za-z]/, "Password harus mengandung minimal 1 huruf")
        .regex(/[0-9]/, "Password harus mengandung minimal 1 angka"),
});

module.exports = {
    loginSchema,
    changePasswordSchema
};
