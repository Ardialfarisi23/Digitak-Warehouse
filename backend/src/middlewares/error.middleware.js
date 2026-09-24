module.exports = (err, req, res, next) => {
  console.error(err);

  if (err && err.code === "P2002") {
    return res.status(409).json({
      success: false,
      message: "Data sudah digunakan (duplikat).",
      field: err?.meta?.target || null,
    });
  }

  const statusCode = err?.statusCode || 500;
  const message =
    (err?.message && String(err.message).trim()) ||
    "Internal Server Error";

  res.status(statusCode).json({
    success: false,
    message,
  });
};