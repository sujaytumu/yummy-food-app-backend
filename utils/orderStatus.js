// NEW: shared order-status config so backend validation and any future UI stay in sync
const STATUS_ORDER = ['placed', 'preparing', 'out_for_delivery', 'delivered'];

const STATUS_LABEL = {
    placed: 'Order placed',
    preparing: 'Preparing your food',
    out_for_delivery: 'Out for delivery',
    delivered: 'Delivered'
};

// A status can only move forward (or stay the same - treated as a no-op by the caller)
const canAdvance = (from, to) => {
    const i = STATUS_ORDER.indexOf(from);
    const j = STATUS_ORDER.indexOf(to);
    return i !== -1 && j !== -1 && j >= i;
};

module.exports = { STATUS_ORDER, STATUS_LABEL, canAdvance };
