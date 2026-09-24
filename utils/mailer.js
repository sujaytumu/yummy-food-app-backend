const { Resend } = require('resend');
const { buildReceiptBuffer } = require('./receiptPdf');

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => `₹${Number(n).toFixed(2)}`;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// NEW: emails the receipt PDF via Resend (HTTPS API - works on Render free, SMTP ports are blocked there).
// Never throws: returns { ok, error }.
// Needs env RESEND_API_KEY. MAIL_FROM optional (default is Resend's shared sender, which can only deliver to the Resend account owner's email until a domain is verified).
const sendReceiptEmail = async (order, to) => {
    try {
        if (!process.env.RESEND_API_KEY) return { ok: false, error: 'Email is not configured on the server' };
        if (!EMAIL_RE.test(String(to || ''))) return { ok: false, error: 'Invalid email address' };

        const shortId = order._id.toString().slice(-8).toUpperCase();
        const pdf = await buildReceiptBuffer(order);
        const rows = order.items
            .map((it) => `<tr><td style="padding:6px 0">${esc(it.productName)} × ${esc(it.qty)}</td><td style="padding:6px 0;text-align:right">${money(it.price * it.qty)}</td></tr>`)
            .join('');

        const html = `
<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#222">
  <div style="background:#e15b64;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0"><h2 style="margin:0">YUMMY</h2><div>Payment successful</div></div>
  <div style="border:1px solid #eee;border-top:none;padding:20px;border-radius:0 0 8px 8px">
    <p>Hi ${esc(order.customer?.name || 'there')}, thanks for your order from <b>${esc(order.firm?.firmName || 'your restaurant')}</b>.</p>
    <p style="margin:4px 0">Order <b>#${shortId}</b></p>
    <table style="width:100%;border-collapse:collapse;border-top:1px solid #eee;border-bottom:1px solid #eee">${rows}
      <tr><td style="padding:8px 0;font-weight:bold">Total paid</td><td style="padding:8px 0;text-align:right;font-weight:bold">${money(order.amount / 100)}</td></tr>
    </table>
    <p style="margin:12px 0 4px"><b>Paid via:</b> ${esc(order.paymentDetail || order.paymentMethod || 'Razorpay')}</p>
    <p style="margin:4px 0"><b>Payment ID:</b> ${esc(order.razorpayPaymentId)}</p>
    <p style="margin:4px 0"><b>Delivery to:</b> ${esc(order.customer?.address)}</p>
    <p style="margin-top:16px">Your full receipt is attached as a PDF.</p>
  </div>
</div>`;

        const resend = new Resend(process.env.RESEND_API_KEY);
        const { error } = await resend.emails.send({
            from: process.env.MAIL_FROM || 'Yummy <onboarding@resend.dev>',
            to: [to],
            subject: `Your Yummy receipt - Order #${shortId}`,
            html,
            attachments: [{ filename: `Yummy-Receipt-${shortId}.pdf`, content: pdf }]
        });
        if (error) return { ok: false, error: error.message || 'Email provider rejected the message' };
        return { ok: true };
    } catch (e) {
        console.error('❌ sendReceiptEmail error:', e);
        return { ok: false, error: e.message || 'Email failed' };
    }
};

module.exports = { sendReceiptEmail, EMAIL_RE };
