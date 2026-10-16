const { z } = require("zod");

// Reusable schema for strong password: min 8 characters, at least one letter and one number
const strongPasswordSchema = z
  .string({
    required_error: "Password wajib diisi",
  })
  .min(8, "Password minimal 8 karakter")
  .regex(/[A-Za-z]/, "Password harus mengandung minimal 1 huruf")
  .regex(/[0-9]/, "Password harus mengandung minimal 1 angka");

module.exports = { strongPasswordSchema };