const profileRepository = require("./profile.repository");
const AppError = require("../../shared/errors");
const passwordHelper = require("../../shared/password");

const getProfile = async (id) => {
  const personnel = await profileRepository.findById(id);

  if (!personnel) {
    throw new AppError("Personnel tidak ditemukan.", 404);
  }

  return personnel;
};

const updateProfile = async (id, data) => {
  const personnel = await profileRepository.findById(id);

  if (!personnel) {
    throw new AppError("Personnel tidak ditemukan.", 404);
  }

  if (data.password) {
    data.password = await passwordHelper.hash(data.password);
  }

  return await profileRepository.updateProfile(id, data);
};

module.exports = {
  getProfile,
  updateProfile,
};
