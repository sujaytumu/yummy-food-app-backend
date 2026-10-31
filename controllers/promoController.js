const Promo = require('../models/Promo');
const Product = require('../models/Product');
const Vendor = require('../models/Vendor');
const { normalizeCode, computeDiscount } = require('../utils/promo');

const parsePrice = (raw) => {
    const n = parseFloat(String(raw ?? '').replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) ? n : NaN;
};
const isId = (v) => /^[a-f0-9]{24}$/i.test(String(v || ''));

// Server-side cart subtotal in rupees (same rules as createOrder: prices come from the DB)
const cartSubtotal = async (firmId, items) => {
    if (!isId(firmId) || !Array.isArray(items) || items.length === 0) return NaN;
    const products = await Product.find({ _id: { $in: items.map((i) => i.productId).filter(isId) } });
    let total = 0;
    for (const it of items) {
        const qty = parseInt(it.qty, 10);
        const p = products.find((x) => x._id.toString() === it.productId);
        if (!p || !(qty > 0) || p.inStock === false || !p.firm.some((f) => f.toString() === firmId)) return NaN;
        const price = parsePrice(p.price);
        if (!(price > 0)) return NaN;
        total += price * qty;
    }
    return total;
};

// POST /promo/validate  { firmId, code, items:[{productId, qty}] }  (public)
const validatePromo = async (req, res) => {
    try {
        const { firmId, items } = req.body || {};
        const code = normalizeCode(req.body?.code);
        if (!code || !isId(firmId)) return res.status(400).json({ error: 'Enter a promo code' });
        const subtotal = await cartSubtotal(firmId, items);
        if (!Number.isFinite(subtotal)) return res.status(400).json({ error: 'Your cart could not be checked. Please refresh the menu.' });
        const promo = await Promo.findOne({ firm: firmId, code });
        const r = computeDiscount(promo, subtotal);
        if (!r.ok) return res.status(400).json({ error: r.error });
        res.status(200).json({ code, discount: r.discount, subtotal, total: Math.round((subtotal - r.discount) * 100) / 100 });
    } catch (e) {
        console.error('validatePromo error:', e.message);
        res.status(500).json({ error: 'Could not check the promo code' });
    }
};

// vendor: the firm this vendor owns
const ownFirmId = async (vendorId) => {
    const v = await Vendor.findById(vendorId);
    return v?.firm?.[0] || null;
};

// POST /promo  (vendor)
const createPromo = async (req, res) => {
    try {
        const firm = await ownFirmId(req.vendorId);
        if (!firm) return res.status(400).json({ error: 'Add your restaurant first' });
        const code = normalizeCode(req.body.code);
        const type = req.body.type;
        const value = Number(req.body.value);
        const minOrder = Number(req.body.minOrder || 0);
        const maxDiscount = Number(req.body.maxDiscount || 0);
        const usageLimit = parseInt(req.body.usageLimit || 0, 10);
        if (!/^[A-Z0-9]{3,16}$/.test(code)) return res.status(400).json({ error: 'Code must be 3-16 letters or numbers' });
        if (!['percent', 'flat'].includes(type)) return res.status(400).json({ error: 'Choose percent or flat' });
        if (!(value >= 1) || (type === 'percent' && value > 90)) {
            return res.status(400).json({ error: type === 'percent' ? 'Percent must be between 1 and 90' : 'Enter a discount of at least Rs. 1' });
        }
        if (minOrder < 0 || maxDiscount < 0 || !(usageLimit >= 0)) return res.status(400).json({ error: 'Limits cannot be negative' });
        let expiresAt;
        if (req.body.expiresAt) {
            expiresAt = new Date(req.body.expiresAt);
            if (isNaN(expiresAt)) return res.status(400).json({ error: 'Invalid expiry date' });
            expiresAt.setHours(23, 59, 59, 999);
        }
        const promo = await Promo.create({ firm, code, type, value, minOrder, maxDiscount, usageLimit, expiresAt });
        res.status(201).json({ promo });
    } catch (e) {
        if (e.code === 11000) return res.status(409).json({ error: 'You already have a code with that name' });
        console.error('createPromo error:', e.message);
        res.status(500).json({ error: 'Could not create the promo code' });
    }
};

// GET /promo/mine  (vendor)
const listMyPromos = async (req, res) => {
    try {
        const firm = await ownFirmId(req.vendorId);
        const promos = firm ? await Promo.find({ firm }).sort({ createdAt: -1 }) : [];
        res.status(200).json({ promos });
    } catch (e) {
        res.status(500).json({ error: 'Could not load promo codes' });
    }
};

// PATCH /promo/:id  { active }   and   DELETE /promo/:id   (vendor, own firm only)
const getOwned = async (req) => {
    const firm = await ownFirmId(req.vendorId);
    if (!firm || !isId(req.params.id)) return null;
    return Promo.findOne({ _id: req.params.id, firm });
};
const setActive = async (req, res) => {
    try {
        const promo = await getOwned(req);
        if (!promo) return res.status(404).json({ error: 'Promo code not found' });
        promo.active = !!req.body.active;
        await promo.save();
        res.status(200).json({ promo });
    } catch (e) { res.status(500).json({ error: 'Could not update the promo code' }); }
};
const deletePromo = async (req, res) => {
    try {
        const promo = await getOwned(req);
        if (!promo) return res.status(404).json({ error: 'Promo code not found' });
        await promo.deleteOne();
        res.status(200).json({ ok: true });
    } catch (e) { res.status(500).json({ error: 'Could not delete the promo code' }); }
};

module.exports = { validatePromo, createPromo, listMyPromos, setActive, deletePromo };
