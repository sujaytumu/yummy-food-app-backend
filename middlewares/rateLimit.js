const rateLimit = require('express-rate-limit');

const tooMany = (what) => ({ error: `Too many ${what}. Please wait a few minutes and try again.` });

// Only FAILED attempts count (skipSuccessfulRequests), so normal use is never throttled.
// Limit 1: per IP address.
const loginLimiterByIp = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: tooMany('failed login attempts')
});

// Limit 2: per account, so an attacker rotating IP addresses still can't hammer one email.
// (Trade-off: someone can briefly lock a known email out; 15 minutes, and only after 10 failures.)
const loginLimiterByEmail = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => 'email:' + String(req.body?.email || '').trim().toLowerCase().slice(0, 254),
    message: tooMany('failed login attempts for this account')
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: tooMany('sign-up attempts')
});

const refreshLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: tooMany('session refresh requests')
});

module.exports = { loginLimiterByIp, loginLimiterByEmail, registerLimiter, refreshLimiter };
