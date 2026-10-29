const rateLimit = require('express-rate-limit');

// NEW: brute-force protection on auth routes.
// Keyed by IP; counts only failed/attempted requests toward the limit via skipSuccessfulRequests
// so a vendor typing their password correctly never gets blocked by their own past mistakes.
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 8,                   // 8 attempts per IP per window
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: { error: "Too many login attempts. Please try again in a few minutes." }
});

// NEW: looser limit on registration, mainly to stop automated account-creation spam
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many registration attempts from this network. Please try again later." }
});

module.exports = { loginLimiter, registerLimiter };
