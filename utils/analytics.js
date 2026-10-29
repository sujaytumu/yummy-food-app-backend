// Pure sales-analytics calculation (no database access) so it can be tested on its own.
// Days are bucketed in India time (IST, UTC+5:30), matching how vendors read their day.
const IST_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const istDay = (d) => new Date(new Date(d).getTime() + IST_MS).toISOString().slice(0, 10);
const round2 = (n) => Math.round(n * 100) / 100;

// First instant (UTC) of the IST day that is `days - 1` days before today's IST day.
const periodStart = (days, now = new Date()) => {
    const todayStartIst = Date.parse(istDay(now) + 'T00:00:00.000Z') - IST_MS;
    return new Date(todayStartIst - (days - 1) * DAY_MS);
};

// orders: paid orders { paidAt|createdAt, amount (paise), items: [{ product, productName, price (rupees), qty }], deliveryStatus }
const buildAnalytics = (orders, days, now = new Date()) => {
    const start = periodStart(days, now);
    const daily = new Map();
    for (let i = 0; i < days; i++) {
        daily.set(istDay(new Date(start.getTime() + i * DAY_MS + 12 * 60 * 60 * 1000)), { date: null, revenue: 0, orders: 0 });
    }
    for (const [date, row] of daily) row.date = date;

    const items = new Map();
    const statusCounts = { placed: 0, preparing: 0, out_for_delivery: 0, delivered: 0 };
    let revenue = 0, count = 0, itemsSold = 0;

    for (const o of orders) {
        const when = new Date(o.paidAt || o.createdAt);
        if (!(when >= start) || when > now) continue;
        const row = daily.get(istDay(when));
        if (!row) continue;
        const rupees = (Number(o.amount) || 0) / 100;
        row.revenue += rupees; row.orders += 1;
        revenue += rupees; count += 1;
        const st = o.deliveryStatus || 'placed';
        if (st in statusCounts) statusCounts[st] += 1;
        for (const it of o.items || []) {
            const qty = Number(it.qty) || 0;
            itemsSold += qty;
            const key = String(it.product || it.productName);
            const cur = items.get(key) || { name: it.productName || 'Item', qty: 0, revenue: 0 };
            cur.qty += qty; cur.revenue += (Number(it.price) || 0) * qty;
            items.set(key, cur);
        }
    }

    const topItems = [...items.values()]
        .sort((a, b) => b.qty - a.qty || b.revenue - a.revenue || a.name.localeCompare(b.name))
        .slice(0, 8)
        .map((i) => ({ name: i.name, qty: i.qty, revenue: round2(i.revenue) }));

    return {
        days,
        from: istDay(start),
        to: istDay(now),
        totals: { revenue: round2(revenue), orders: count, itemsSold, avgOrderValue: count ? round2(revenue / count) : 0 },
        daily: [...daily.values()].map((d) => ({ date: d.date, revenue: round2(d.revenue), orders: d.orders })),
        topItems,
        statusCounts
    };
};

module.exports = { buildAnalytics, periodStart, istDay };
