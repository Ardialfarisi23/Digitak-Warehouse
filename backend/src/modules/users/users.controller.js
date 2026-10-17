const usersService = require("./users.service");
const response = require("../../shared/response");

const multer = require("multer");
const path = require("path");
const fs = require("fs");

const avatarsDir = path.join(__dirname, "../../../uploads/avatars");

if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, avatarsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${req.user.id}-${uniqueSuffix}${ext}`);
  },
});

const avatarFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mime = allowedTypes.test(file.mimetype);

  if (ext && mime) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed (jpg, jpeg, png, webp)."), false);
  }
};

const avatarUpload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: avatarFilter,
}).single("avatar");

const updateAvatar = async (req, res, next) => {
  try {
    const result = await usersService.updateAvatar(req.user.id, req.file);
    return response.success(res, "Foto profil berhasil diperbarui.", result);
  } catch (err) {
    next(err);
  }
};

const resetLink = async (req, res, next) => {
  try {
    const { user_id } = req.params;
    const result = await usersService.generateResetLinkForUser(user_id);
    // Audit log: actor = admin (req.user.id), entity = user_account, entityId = user_id, aksi = "reset_link_created"
    const { createAuditLog } = require("../../utils/audit-log");
    try {
      await createAuditLog({
        entityType: "user_account",
        entityId: BigInt(user_id),
        aksi: "reset_link_created",
        actorId: BigInt(req.user.id),
        dataSebelum: {
          email: result.email,
        },
        dataSesudah: {
          expires: result.expires,
        },
      });
    } catch (auditErr) {
      console.error("Gagal membuat audit log untuk reset link:", auditErr.message);
    }
    return response.success(res, "Link reset password berhasil dibuat.", {
      resetUrl: result.resetUrl,
      expires: result.expires,
    });
  } catch (err) {
    next(err);
  }
};

const deleteAvatar = async (req, res, next) => {
  try {
    const result = await usersService.deleteAvatar(req.user.id);
    return response.success(res, "Foto profil berhasil dihapus.", result);
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const result = await usersService.create(req.body);
    return response.success(res, "Akun berhasil dibuat.", result, 201);
  } catch (err) {
    next(err);
  }
};

const findAll = async (req, res, next) => {
  try {
    const result = await usersService.findAll(req.query);
    return response.success(res, "Daftar akun berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const findById = async (req, res, next) => {
  try {
    const result = await usersService.findById(req.params.user_id);
    return response.success(res, "Detail akun berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const result = await usersService.update(req.params.user_id, req.body, req.user.id);
    return response.success(res, "Akun berhasil diperbarui.", result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  create,
  findAll,
  findById,
  update,
  updateAvatar,
  deleteAvatar,
  avatarUpload,
  resetLink,
};
