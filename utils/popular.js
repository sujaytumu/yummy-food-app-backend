// Most-ordered dishes (pure, no DB). `orders` are paid orders with items:[{product, qty}].
// A dish needs at least `minUnits` sold so one lucky order doesn't crown it.
const topSellers = (orders, { limit = 3, minUnits = 3 } = {}) => {
    const sold = new Map();
    for (const o of orders || []) {
        for (const it of o.items || []) {
            const id = it.product && String(it.product);
            const qty = parseInt(it.qty, 10);
            if (!id || !(qty > 0)) continue;
            sold.set(id, (sold.get(id) || 0) + qty);
        }
    }
    return [...sold.entries()]
        .filter(([, n]) => n >= minUnits)
        .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
        .slice(0, limit)
        .map(([id]) => id);
};

module.exports = { topSellers };
