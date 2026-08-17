const profileService = require("./profile.service");
const response = require("../../shared/response");

const getProfile = async (req, res, next) => {
  try {
    const result = await profileService.getProfile(req.user.id);
    return response.success(res, "Data profile berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const result = await profileService.updateProfile(req.user.id, req.body);
    return response.success(res, "Profile berhasil diperbarui.", result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getProfile,
  updateProfile,
};
