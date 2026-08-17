const authService = require("./auth.service");
const response = require("../../shared/response");

const login = async (req, res, next) => {
  try {

    const { email, password } = req.body;

    const result = await authService.login(email, password);

    return response.success(
      res,
      "Login berhasil",
      result
    );



  } catch (err) {
    next(err);
  }
};

const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return response.error(res, "Refresh token tidak ditemukan.", 401);
    }

    const result = await authService.refreshAccessToken(refreshToken);

    return response.success(res, "Access token berhasil diperbarui.", result);
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {

    try {

        const result = await authService.logout();

        return response.success(
            res,
            result.message
        );

    } catch (err) {

        next(err);

    }

};

const me = async (req, res, next) => {

    try {

        return response.success(
            res,
            "Data user berhasil diambil.",
            req.user
        );

    } catch (err) {

        next(err);

    }

};

module.exports = {
    login,
    refresh,
    logout,
    me
};