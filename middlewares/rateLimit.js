const rateLimit = require('express-rate-limit');

// Extra limits on top of middlewares/rateLimiter.js (per-IP login + register).
// Only FAILED attempts count (skipSuccessfulRequests), so normal use is never throttled.

// Per account, so an attacker rotating IP addresses still can't hammer one email.
// (Trade-off: someone can briefly lock a known email out; 15 minutes, and only after 10 failures.)
const loginLimiterByEmail = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => 'email:' + String(req.body?.email || '').trim().toLowerCase().slice(0, 254),
    message: { error: 'Too many failed login attempts for this account. Please wait a few minutes and try again.' }
});

const refreshLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many session refresh requests. Please wait a few minutes.' }
});

module.exports = { loginLimiterByEmail, refreshLimiter };
