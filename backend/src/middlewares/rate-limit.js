const rateLimit = require("express-rate-limit");
const { error } = require("../shared/response");

// Helper to create a limiter with common options
const createLimiter = ({
  windowMs,
  max,
  keyGenerator,
  skipFailedRequests = false,
  skipSuccessfulRequests = false,
}) => {
  return rateLimit({
    windowMs,
    max,
    keyGenerator,
    skipFailedRequests,
    skipSuccessfulRequests,
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers,
    handler: (req, res /* next */) => {
      // Send a 429 response with the project's error format
      return error(
        res,
        "Terlalu banyak percobaan. Coba lagi beberapa menit lagi.",
        429
      );
    },
  });
};

// Environment variables configuration with defaults
const LONGGAR_LOGIN_LIMIT = parseInt(process.env.LONGGAR_LOGIN_LIMIT) || 20;
const LONGGAR_LOGIN_WINDOW = parseInt(process.env.LONGGAR_LOGIN_WINDOW) || 15; // minutes

const LONGGAR_PASSWORD_RESET_LIMIT = parseInt(process.env.LONGGAR_PASSWORD_RESET_LIMIT) || 10;
const LONGGAR_PASSWORD_RESET_WINDOW = parseInt(process.env.LONGGAR_PASSWORD_RESET_WINDOW) || 15; // minutes

const LONGGAR_REFRESH_LIMIT = parseInt(process.env.LONGGAR_REFRESH_LIMIT) || 60;
const LONGGAR_REFRESH_WINDOW = parseInt(process.env.LONGGAR_REFRESH_WINDOW) || 15; // minutes

const LONGGAR_UPLOAD_LIMIT = parseInt(process.env.LONGGAR_UPLOAD_LIMIT) || 60;
const LONGGAR_UPLOAD_WINDOW = parseInt(process.env.LONGGAR_UPLOAD_WINDOW) || 15; // minutes

const LONGGAR_DELETE_LIMIT = parseInt(process.env.LONGGAR_DELETE_LIMIT) || 60;
const LONGGAR_DELETE_WINDOW = parseInt(process.env.LONGGAR_DELETE_WINDOW) || 15; // minutes

// Trust proxy setting (optional)
// If TRUST_PROXY is set, we will enable trust proxy in the app (to be done in server.js)
// This middleware does not set trust proxy; it's the responsibility of the app.
// We just note that if the app is behind a proxy, TRUST_PROXY should be set to the appropriate value (e.g., 'loopback', '127.0.0.1', or an array of IPs)
// and then in server.js we should do: app.set('trust proxy', process.env.TRUST_PROXY);

// Key generator functions
const ipKeyGenerator = (req) => {
  // req.ip already includes proxy trust logic if trust proxy is set
  return req.ip;
};

const userIdOrIpKeyGenerator = (req) => {
  // If we have a user (from auth middleware), use user id, else fallback to IP
  if (req.user && req.user.id) {
    return `user_${req.user.id}`;
  }
  return req.ip;
};

// Limiters
const loginLimiter = createLimiter({
  windowMs: LONGGAR_LOGIN_WINDOW * 60 * 1000, // convert minutes to milliseconds
  max: LONGGAR_LOGIN_LIMIT,
  keyGenerator: ipKeyGenerator, // login is before auth, so we use IP
});

const passwordResetLimiter = createLimiter({
  windowMs: LONGGAR_PASSWORD_RESET_WINDOW * 60 * 1000,
  max: LONGGAR_PASSWORD_RESET_LIMIT,
  keyGenerator: ipKeyGenerator, // forgot/reset password are before auth
});

const refreshLimiter = createLimiter({
  windowMs: LONGGAR_REFRESH_WINDOW * 60 * 1000,
  max: LONGGAR_REFRESH_LIMIT,
  keyGenerator: ipKeyGenerator, // refresh token endpoint is before auth? Actually, refresh endpoint does not require auth? Let's check: in auth.routes.js, refresh endpoint does not have authenticate middleware. So it's before auth.
});

const uploadLimiter = createLimiter({
  windowMs: LONGGAR_UPLOAD_WINDOW * 60 * 1000,
  max: LONGGAR_UPLOAD_LIMIT,
  keyGenerator: userIdOrIpKeyGenerator, // upload endpoints are after auth
});

const deleteLimiter = createLimiter({
  windowMs: LONGGAR_DELETE_WINDOW * 60 * 1000,
  max: LONGGAR_DELETE_LIMIT,
  keyGenerator: userIdOrIpKeyGenerator, // delete endpoints are after auth
});

// In test environment, we want to disable the limiter (set max to a very high number)
if (process.env.NODE_ENV === "test") {
  loginLimiter.max = 999999;
  passwordResetLimiter.max = 999999;
  refreshLimiter.max = 999999;
  uploadLimiter.max = 999999;
  deleteLimiter.max = 999999;
}

module.exports = {
  loginLimiter,
  passwordResetLimiter,
  refreshLimiter,
  uploadLimiter,
  deleteLimiter,
};