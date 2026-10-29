const Vendor = require('../models/Vendor');
const Firm = require('../models/Firm'); // ✅ Firm model added
const bcrypt = require('bcryptjs');
const dotEnv = require('dotenv');
const { signAccessToken, hashToken, newRefreshToken, MAX_SESSIONS } = require('../utils/tokens');

dotEnv.config();

// ✅ Register Vendor
const vendorRegister = async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const existingVendor = await Vendor.findOne({ email });
    if (existingVendor) {
      return res.status(400).json({ error: "Email already taken" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newVendor = new Vendor({
      username,
      email,
      password: hashedPassword
    });

    await newVendor.save();
    console.log('✅ Vendor registered:', email);
    res.status(201).json({ message: "Vendor registered successfully" });

  } catch (error) {
    console.error('❌ Error in vendorRegister:', error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ Login Vendor
const vendorLogin = async (req, res) => {
  const { email, password } = req.body;
  try {
    const vendor = await Vendor.findOne({ email }).populate('firm');

    if (!vendor || !(await bcrypt.compare(password, vendor.password))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = signAccessToken(vendor._id);

    // Start a long-lived session: keep only the newest MAX_SESSIONS refresh tokens and drop expired ones
    const refresh = newRefreshToken();
    const live = (vendor.refreshTokens || []).filter((t) => t.expiresAt > new Date());
    await Vendor.updateOne(
      { _id: vendor._id },
      { $set: { refreshTokens: [...live, refresh.record].slice(-MAX_SESSIONS) } }
    );

    res.status(200).json({
      success: "Login successful",
      token,
      refreshToken: refresh.token,
      vendorId: vendor._id,
      vendorUsername: vendor.username,
      vendorEmail: vendor.email,
      firmId: vendor.firm?._id || null,
      firmName: vendor.firm?.firmName || ""
    });

    console.log(`✅ Vendor logged in: ${email}`); // never log tokens

  } catch (error) {
    console.error('❌ Error in vendorLogin:', error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// POST /vendor/refresh  body: { refreshToken } -> new access token + rotated refresh token.
// Each refresh token works once: it is removed atomically, so a stolen/replayed copy fails.
const refreshSession = async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken || typeof refreshToken !== 'string') {
      return res.status(400).json({ error: "Refresh token required" });
    }
    const oldHash = hashToken(refreshToken);
    const vendor = await Vendor.findOneAndUpdate(
      { 'refreshTokens.tokenHash': oldHash },
      { $pull: { refreshTokens: { tokenHash: oldHash } } },
      { new: false } // returns the document as it was, so we can read the token's expiry
    );
    const used = vendor && (vendor.refreshTokens || []).find((t) => t.tokenHash === oldHash);
    if (!used || used.expiresAt <= new Date()) {
      return res.status(401).json({ error: "Session expired, please login again", code: 'REFRESH_INVALID' });
    }
    const next = newRefreshToken();
    await Vendor.updateOne({ _id: vendor._id }, { $push: { refreshTokens: { $each: [next.record], $slice: -MAX_SESSIONS } } });
    res.status(200).json({ token: signAccessToken(vendor._id), refreshToken: next.token });
  } catch (error) {
    console.error('❌ Error in refreshSession:', error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// POST /vendor/logout  body: { refreshToken } -> ends this device's session (idempotent)
const vendorLogout = async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (refreshToken && typeof refreshToken === 'string') {
      const h = hashToken(refreshToken);
      await Vendor.updateOne({ 'refreshTokens.tokenHash': h }, { $pull: { refreshTokens: { tokenHash: h } } });
    }
    res.status(200).json({ message: "Logged out" });
  } catch (error) {
    console.error('❌ Error in vendorLogout:', error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ Get All Vendors
const getAllVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find().select('-password -refreshTokens').populate('firm');
    res.status(200).json({ vendors });
  } catch (error) {
    console.error('❌ Error in getAllVendors:', error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ Get Single Vendor by ID
const getVendorById = async (req, res) => {
  const vendorId = req.params.id;

  try {
    const vendor = await Vendor.findById(vendorId).select('-password -refreshTokens').populate('firm');

    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    res.status(200).json({
      vendorId: vendor._id,
      vendorUsername: vendor.username,
      vendorEmail: vendor.email,
      firmId: vendor.firm?._id || null,
      firmName: vendor.firm?.firmName || "",
      vendor
    });

    console.log(`✅ getVendorById: firmId = ${vendor.firm?._id}`);

  } catch (error) {
    console.error('❌ Error in getVendorById:', error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  vendorRegister,
  vendorLogin,
  refreshSession,
  vendorLogout,
  getAllVendors,
  getVendorById
};
