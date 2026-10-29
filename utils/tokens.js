const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const ACCESS_TTL = process.env.ACCESS_TOKEN_TTL || '1h';
const REFRESH_DAYS = Number(process.env.REFRESH_TOKEN_DAYS) || 30;
const MAX_SESSIONS = 5; // refresh tokens kept per vendor (one per device/browser)

const signAccessToken = (vendorId) =>
    jwt.sign({ vendorId }, process.env.JWT_SECRET, { expiresIn: ACCESS_TTL });

const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

// Opaque random token for the client + the record we store (hash only, never the token itself)
const newRefreshToken = () => {
    const token = crypto.randomBytes(48).toString('base64url');
    return {
        token,
        record: { tokenHash: hashToken(token), expiresAt: new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000) }
    };
};

module.exports = { signAccessToken, hashToken, newRefreshToken, MAX_SESSIONS };
