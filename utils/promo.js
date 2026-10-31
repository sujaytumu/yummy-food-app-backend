// Pure promo-code maths (no DB) so it can be unit-tested.
// subtotal is in rupees. Returns { ok, discount (rupees, 2dp), error }.
const normalizeCode = (c) => String(c || '').trim().toUpperCase().replace(/\s+/g, '');

const computeDiscount = (promo, subtotal, now = new Date()) => {
    if (!promo || promo.active === false) return { ok: false, discount: 0, error: 'This promo code is not valid' };
    if (promo.expiresAt && new Date(promo.expiresAt) < now) return { ok: false, discount: 0, error: 'This promo code has expired' };
    if (promo.usageLimit > 0 && (promo.usedCount || 0) >= promo.usageLimit) {
        return { ok: false, discount: 0, error: 'This promo code has reached its usage limit' };
    }
    if (promo.minOrder > 0 && subtotal < promo.minOrder) {
        return { ok: false, discount: 0, error: `Add items worth Rs. ${promo.minOrder} or more to use this code` };
    }
    let discount = promo.type === 'percent' ? (subtotal * promo.value) / 100 : promo.value;
    if (promo.type === 'percent' && promo.maxDiscount > 0) discount = Math.min(discount, promo.maxDiscount);
    // never discount below Re 1: Razorpay needs an amount of at least 100 paise
    discount = Math.min(discount, Math.max(0, subtotal - 1));
    discount = Math.round(discount * 100) / 100;
    if (!(discount > 0)) return { ok: false, discount: 0, error: 'This promo code does not apply to this order' };
    return { ok: true, discount, error: null };
};

module.exports = { normalizeCode, computeDiscount };
