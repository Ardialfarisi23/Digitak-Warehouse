const usersRepository = require("./users.repository");
const AppError = require("../../shared/errors");
const passwordHelper = require("../../shared/password");
const prisma = require("../../config/prisma");
const path = require("path");
const fs = require("fs");

const create = async (data) => {
  const existing = await usersRepository.findByEmail(data.email, { includeInactive: true });

  if (existing) {
    throw new AppError("Email sudah digunakan.", 400);
  }

  if (data.password) {
    data.password_hash = await passwordHelper.hash(data.password);
    delete data.password;
  }

  const result = await usersRepository.create(data);

  try {
    const admins = await prisma.user_account.findMany({
      where: { role: "admin_general", is_aktif: true },
      select: { user_id: true },
    });

    const adminIds = admins
      .filter((admin) => Number(admin.user_id) !== Number(result.user_id))
      .map((admin) => Number(admin.user_id));

    if (adminIds.length > 0) {
      await require("../../modules/notifications/notifications.service").create({
        userId: adminIds,
        type: "info",
        title: "Pengguna Baru Ditambahkan",
        message: `Akun ${result.nama} (${result.email}) telah dibuat dengan role ${result.role}.`,
        link: "/dashboard/users",
      });
    }
  } catch (notifErr) {
    console.error("Gagal membuat notifikasi create user:", notifErr);
  }

  return result;
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

const findByEmail = async (email) => {
  const user = await usersRepository.findByEmail(email, { includeInactive: true });

  if (!user) {
    throw new AppError("Akun tidak ditemukan.", 404);
  }

  return user;
};

const update = async (user_id, data) => {
  const existingUser = await usersRepository.findById(user_id, { includeInactive: true });

  if (!existingUser) {
    throw new AppError("Akun tidak ditemukan.", 404);
  }

  if (data.email && data.email !== existingUser.email) {
    const emailExists = await usersRepository.findByEmail(data.email, { includeInactive: true });
    if (emailExists) {
      throw new AppError("Email sudah digunakan.", 400);
    }
  }

  if (data.password) {
    data.password_hash = await passwordHelper.hash(data.password);
    delete data.password;
  }

  const finalRole = data.role ?? existingUser.role;

  if (finalRole === "staf_gudang") {
    const gudangId = data.gudang_id ?? existingUser.gudang_id;

    if (gudangId === undefined || gudangId === null || gudangId === "") {
      throw new AppError("Gudang yang ditugaskan wajib diisi untuk role Staf Gudang.", 400);
    }
  }

  const result = await usersRepository.update(user_id, data);

  try {
    const admins = await prisma.user_account.findMany({
      where: { role: "admin_general", is_aktif: true },
      select: { user_id: true },
    });

    const adminIds = admins
      .filter((admin) => Number(admin.user_id) !== Number(user_id))
      .map((admin) => Number(admin.user_id));

    if (adminIds.length > 0) {
      await require("../../modules/notifications/notifications.service").create({
        userId: adminIds,
        type: "info",
        title: "Pengguna Diperbarui",
        message: `Akun ${result.nama} (${result.email}) telah diperbarui.`,
        link: "/dashboard/users",
      });
    }
  } catch (notifErr) {
    console.error("Gagal membuat notifikasi update user:", notifErr);
  }

  return result;
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
  findByEmail,
  update,
  updateAvatar,
  deleteAvatar,
};
