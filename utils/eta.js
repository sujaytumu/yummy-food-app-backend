// Delivery time estimate (pure, no DB).
// Before the order leaves: paid time + the restaurant's prep time + a fixed ride time.
// After it leaves: the time it went out + the ride time.
const RIDE_MINUTES = 15;
const MIN_PREP = 5;
const MAX_PREP = 120;
const DEFAULT_PREP = 30;

const clampPrep = (m) => {
    const n = Math.round(Number(m));
    if (!Number.isFinite(n)) return DEFAULT_PREP;
    return Math.min(MAX_PREP, Math.max(MIN_PREP, n));
};

const computeEta = ({ paidAt, prepMinutes, status, statusHistory = [], now = new Date() }) => {
    if (status === 'delivered' || !paidAt) return { etaAt: null, late: false };
    const prep = clampPrep(prepMinutes ?? DEFAULT_PREP);
    let base;
    let minutes;
    if (status === 'out_for_delivery') {
        const out = [...statusHistory].reverse().find((h) => h.status === 'out_for_delivery');
        base = new Date(out?.at || paidAt);
        minutes = RIDE_MINUTES;
    } else {
        base = new Date(paidAt);
        minutes = prep + RIDE_MINUTES;
    }
    const etaAt = new Date(base.getTime() + minutes * 60000);
    return { etaAt: etaAt.toISOString(), late: now > etaAt };
};

module.exports = { computeEta, clampPrep, RIDE_MINUTES, MIN_PREP, MAX_PREP, DEFAULT_PREP };
