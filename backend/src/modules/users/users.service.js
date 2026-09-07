const usersRepository = require("./users.repository");
const AppError = require("../../shared/errors");
const passwordHelper = require("../../shared/password");
const path = require("path");
const fs = require("fs");
const prisma = require("../../config/prisma");

const create = async (data) => {
  const existing = await usersRepository.findByEmail(data.email, { includeInactive: true });

  if (existing) {
    throw new AppError("Email sudah digunakan.", 400);
  }

  if (data.password) {
    data.password_hash = await passwordHelper.hash(data.password);
    delete data.password;
  }

  return await usersRepository.create(data);
};

const findAll = async (query) => {
  return await usersRepository.findAll(query);
};

const findById = async (user_id) => {
  const user = await usersRepository.findById(user_id, { includeInactive: true });

  if (!user) {
    throw new AppError("Akun tidak ditemukan.", 404);
  }

  return user;
};

const update = async (user_id, data) => {
  const user = await usersRepository.findById(user_id, { includeInactive: true });

  if (!user) {
    throw new AppError("Akun tidak ditemukan.", 404);
  }

  if (data.email && data.email !== user.email) {
    const existing = await usersRepository.findByEmail(data.email, { includeInactive: true });
    if (existing) {
      throw new AppError("Email sudah digunakan.", 400);
    }
  }

  if (data.password) {
    data.password_hash = await passwordHelper.hash(data.password);
    delete data.password;
  }

  const finalRole = data.role ?? user.role;

  if (finalRole === "supervisor" || finalRole === "staf_gudang") {
    const gudangId = data.gudang_id ?? user.gudang_id;

    if (gudangId === undefined || gudangId === null || gudangId === "") {
      throw new AppError("Gudang yang ditugaskan wajib diisi untuk role Supervisor atau Staf Gudang.", 400);
    }
  }

  return await usersRepository.update(user_id, data);
};

const updateAvatar = async (userId, file) => {
  const id = BigInt(userId);

  const personil = await prisma.personil.findUnique({
    where: { user_id: id },
    select: { foto: true, personil_id: true },
  });

  if (!personil) {
    throw new AppError("Data personnel tidak ditemukan.", 404);
  }

  const oldFoto = personil.foto;

  if (oldFoto) {
    removeAvatarFile(oldFoto);
  }

  const newFoto = `/uploads/avatars/${file.filename}`;

  await prisma.personil.update({
    where: { personil_id: personil.personil_id },
    data: { foto: newFoto },
  });

  return { foto: newFoto };
};

const removeAvatarFile = (fotoPath) => {
  if (!fotoPath) return;
  const oldPath = path.join(__dirname, "../../../uploads", fotoPath.replace("/uploads/", ""));
  if (fs.existsSync(oldPath)) {
    fs.unlinkSync(oldPath);
  }
};

const deleteAvatar = async (userId) => {
  const id = BigInt(userId);

  const personil = await prisma.personil.findUnique({
    where: { user_id: id },
    select: { foto: true, personil_id: true },
  });

  if (!personil) {
    throw new AppError("Data personnel tidak ditemukan.", 404);
  }

  if (personil.foto) {
    removeAvatarFile(personil.foto);
  }

  await prisma.personil.update({
    where: { personil_id: personil.personil_id },
    data: { foto: null },
  });

  return { foto: null };
};

module.exports = {
  create,
  findAll,
  findById,
  update,
  updateAvatar,
  deleteAvatar,
};
