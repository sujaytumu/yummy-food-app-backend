const PDFDocument = require('pdfkit');

// NOTE: built-in PDF fonts have no ₹ glyph, so amounts are written as "Rs."
// Built-in PDF fonts only support Latin-1: drop hearts/emoji/other scripts instead of printing garbage
const clean = (t) => String(t ?? '').replace(/[^\x20-\x7E\xA0-\xFF\n]/g, '').replace(/\s+/g, ' ').trim() || '-';
const money = (n) => `Rs. ${Number(n).toFixed(2)}`;
const istDate = (d) =>
    new Date(d || Date.now()).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }) + ' IST';

// Returns a PDFKit document (caller pipes + ends it)
const buildReceiptPdf = (order) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const left = 48;
    const right = doc.page.width - 48;
    const shortId = order._id.toString().slice(-8).toUpperCase();

    // ---- header
    doc.rect(0, 0, doc.page.width, 90).fill('#e15b64');
    doc.fillColor('#fff').font('Helvetica-Bold').fontSize(26).text('YUMMY', left, 28);
    doc.font('Helvetica').fontSize(11).text('Order Receipt & Payment Confirmation', left, 58);
    doc.font('Helvetica-Bold').fontSize(12).text('PAID', right - 60, 36, { width: 60, align: 'right' });
    doc.fillColor('#000');

    let y = 115;
    const label = (t, x, yy) => doc.font('Helvetica').fontSize(9).fillColor('#777').text(t.toUpperCase(), x, yy);
    const value = (t, x, yy, w) => doc.font('Helvetica-Bold').fontSize(11).fillColor('#111').text(clean(t), x, yy, { width: w });

    // ---- order + restaurant
    label('Order No.', left, y);        value(`#${shortId}`, left, y + 12, 200);
    label('Date & time', 260, y);       value(istDate(order.paidAt || order.createdAt), 260, y + 12, 290);
    y += 45;
    label('Restaurant', left, y);       value(order.firm?.firmName, left, y + 12, 200);
    label('Restaurant area', 260, y);   value(order.firm?.area, 260, y + 12, 290);
    y += 50;

    // ---- delivery details
    doc.moveTo(left, y).lineTo(right, y).strokeColor('#ddd').stroke();
    y += 12;
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#e15b64').text('Delivery details', left, y);
    y += 22;
    label('Name', left, y);     value(order.customer?.name, left, y + 12, 200);
    label('Phone', 260, y);     value(order.customer?.phone, 260, y + 12, 290);
    y += 40;
    label('Delivery address', left, y);
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#111').text(clean(order.customer?.address), left, y + 12, { width: right - left });
    y = doc.y + 18;

    // ---- items table
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#e15b64').text('Items ordered', left, y);
    y += 24;
    const colItem = left, colQty = 330, colPrice = 400, colAmt = 480;
    doc.rect(left, y - 4, right - left, 22).fill('#f4f4f4');
    doc.fillColor('#333').font('Helvetica-Bold').fontSize(10);
    doc.text('Item', colItem + 6, y + 2);
    doc.text('Qty', colQty, y + 2, { width: 50, align: 'center' });
    doc.text('Price', colPrice, y + 2, { width: 70, align: 'right' });
    doc.text('Amount', colAmt, y + 2, { width: right - colAmt, align: 'right' });
    y += 28;

    doc.font('Helvetica').fontSize(10.5).fillColor('#111');
    let sub = 0;
    order.items.forEach((it) => {
        if (y > doc.page.height - 200) { doc.addPage(); y = 60; }
        const amt = it.price * it.qty;
        sub += amt;
        doc.text(clean(it.productName), colItem + 6, y, { width: colQty - colItem - 14 });
        const rowBottom = doc.y;
        doc.text(String(it.qty), colQty, y, { width: 50, align: 'center' });
        doc.text(money(it.price), colPrice, y, { width: 70, align: 'right' });
        doc.text(money(amt), colAmt, y, { width: right - colAmt, align: 'right' });
        y = Math.max(rowBottom, y + 14) + 8;
        doc.moveTo(left, y - 4).lineTo(right, y - 4).strokeColor('#eee').stroke();
    });

    // ---- totals
    y += 6;
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#111');
    doc.text('Total paid', colPrice - 40, y, { width: 110, align: 'right' });
    doc.text(money(order.amount / 100), colAmt, y, { width: right - colAmt, align: 'right' });
    y += 34;

    // ---- payment information
    if (y > doc.page.height - 190) { doc.addPage(); y = 60; }
    doc.moveTo(left, y).lineTo(right, y).strokeColor('#ddd').stroke();
    y += 12;
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#e15b64').text('Payment information', left, y);
    y += 22;
    label('Status', left, y);            value('Paid successfully', left, y + 12, 200);
    label('Paid via', 260, y);           value(order.paymentDetail || order.paymentMethod || 'Razorpay', 260, y + 12, 290);
    y += 42;
    label('Payment ID', left, y);        value(order.razorpayPaymentId, left, y + 12, 200);
    label('Razorpay order ID', 260, y);  value(order.razorpayOrderId, 260, y + 12, 290);
    y += 42;
    label('Amount paid', left, y);       value(`${money(order.amount / 100)} (${order.currency || 'INR'})`, left, y + 12, 200);
    label('Paid on', 260, y);            value(istDate(order.paidAt || order.createdAt), 260, y + 12, 290);

    // ---- footer
    doc.font('Helvetica').fontSize(9).fillColor('#888')
       .text('This is a computer generated receipt and does not need a signature. Payments are processed securely by Razorpay in INR.',
             left, doc.page.height - 70, { width: right - left, align: 'center', lineBreak: true });
    return doc;
};

module.exports = { buildReceiptPdf };
