require('dotenv').config();
const connectDB = require('./config/db');
const express = require('express');
const cors = require('cors');
const PDFDocument = require('pdfkit');
const Invoice = require('./models/Invoice');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3005;
const ORDER_SERVICE_URLS = Array.from(new Set(
    [
        process.env.ORDER_SERVICE_URL,
        'http://order-service:3002',
        'http://localhost:3002',
        'http://127.0.0.1:3002',
    ]
        .filter(Boolean)
        .map((url) => url.replace(/\/+$/, ''))
));
connectDB();

const ok = (res, data, status = 200) => res.status(status).json({ success: true, ...data });
const err = (res, message, status = 400) => res.status(status).json({ success: false, message });

const createInvoiceFromOrder = async (order) => {
    if (!order) throw new Error('Order payload is required');

    const existing = await Invoice.findOne({ orderId: order._id || order.orderId });
    if (existing) return existing;

    return Invoice.create({
        orderId: order._id || order.orderId,
        userId: order.userId,
        serviceId: order.serviceId,
        serviceName: order.serviceName,
        amount: Number(order.amount),
        address: order.address,
        scheduledDate: order.scheduledDate,
        paidAt: order.paidAt || order.updatedAt || new Date(),
    });
};

const fetchOrderById = async (orderId) => {
    if (typeof fetch !== 'function') {
        const error = new Error('Invoice was not found and this runtime cannot fetch the order details.');
        error.status = 404;
        throw error;
    }

    let lastError = null;

    for (const baseUrl of ORDER_SERVICE_URLS) {
        try {
            const response = await fetch(`${baseUrl}/orders/${orderId}`);
            const payload = await response.json().catch(() => ({}));

            if (response.ok && payload.order) return payload.order;

            const message = payload.message || payload.error || `Order service returned ${response.status}`;
            const error = new Error(message);
            error.status = response.status === 404 ? 404 : 502;
            lastError = error;

            if (response.status === 404) continue;
        } catch (error) {
            lastError = error;
        }
    }

    if (lastError) throw lastError;

    const error = new Error('Invoice not found');
    error.status = 404;
    throw error;
};

const loadInvoiceForOrder = async (orderId) => {
    let invoice = await Invoice.findOne({ orderId });
    if (invoice) return invoice;

    const order = await fetchOrderById(orderId);

    const isPaid = String(order.paymentStatus || '').toUpperCase() === 'PAID';
    if (!isPaid) {
        const error = new Error('Invoice is available only after payment is completed.');
        error.status = 409;
        throw error;
    }

    return createInvoiceFromOrder(order);
};

const streamInvoicePdf = (res, invoice) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoiceNo}.pdf"`);
    doc.pipe(res);

    doc.rect(0, 0, 595, 120).fill('#0f0f1a');
    doc.fillColor('#8b5cf6').fontSize(28).font('Helvetica-Bold').text('VAULTRIX', 50, 35);
    doc.fillColor('#94a3b8').fontSize(10).font('Helvetica').text('Professional Service Platform', 50, 68);
    doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text('INVOICE', 400, 45, { align: 'right' });
    doc.fillColor('#06b6d4').fontSize(11).font('Helvetica').text(invoice.invoiceNo, 400, 75, { align: 'right' });

    doc.fillColor('#1e1e2e').rect(50, 140, 495, 80).fill('#1e1e2e');
    doc.fillColor('#94a3b8').fontSize(9).font('Helvetica').text('INVOICE DATE', 65, 152);
    doc.fillColor('#f1f5f9').fontSize(11).font('Helvetica-Bold').text(new Date(invoice.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }), 65, 165);
    doc.fillColor('#94a3b8').fontSize(9).font('Helvetica').text('STATUS', 220, 152);
    doc.fillColor('#10b981').fontSize(11).font('Helvetica-Bold').text('PAID', 220, 165);
    doc.fillColor('#94a3b8').fontSize(9).font('Helvetica').text('ORDER ID', 320, 152);
    doc.fillColor('#f1f5f9').fontSize(9).font('Helvetica').text(invoice.orderId, 320, 165, { width: 200 });

    doc.moveTo(50, 240).lineTo(545, 240).strokeColor('#2d2d3d').lineWidth(1).stroke();
    doc.fillColor('#94a3b8').fontSize(9).font('Helvetica').text('SERVICE DETAILS', 50, 255);
    doc.moveTo(50, 268).lineTo(545, 268).strokeColor('#2d2d3d').lineWidth(0.5).stroke();

    doc.fillColor('#8b5cf6').fontSize(9).font('Helvetica-Bold');
    doc.text('SERVICE', 50, 280);
    doc.text('ADDRESS', 220, 280);
    doc.text('SCHEDULED DATE', 370, 280);
    doc.text('AMOUNT', 490, 280, { align: 'right' });
    doc.moveTo(50, 294).lineTo(545, 294).strokeColor('#2d2d3d').lineWidth(0.5).stroke();

    doc.fillColor('#f1f5f9').fontSize(10).font('Helvetica');
    doc.text(invoice.serviceName || invoice.serviceId, 50, 306, { width: 160 });
    doc.text(invoice.address || '-', 220, 306, { width: 140 });
    const schedDate = invoice.scheduledDate ? new Date(invoice.scheduledDate).toLocaleDateString('en-IN') : '-';
    doc.text(schedDate, 370, 306, { width: 110 });
    doc.fillColor('#10b981').fontSize(12).font('Helvetica-Bold');
    doc.text(`$${Number(invoice.amount).toFixed(2)}`, 490, 304, { align: 'right' });

    doc.rect(350, 340, 195, 55).fill('#1e1e2e');
    doc.fillColor('#94a3b8').fontSize(9).font('Helvetica').text('TOTAL AMOUNT PAID', 365, 352);
    doc.fillColor('#10b981').fontSize(20).font('Helvetica-Bold').text(`$${Number(invoice.amount).toFixed(2)}`, 365, 367);

    doc.moveTo(50, 680).lineTo(545, 680).strokeColor('#2d2d3d').lineWidth(1).stroke();
    doc.fillColor('#94a3b8').fontSize(8).font('Helvetica').text('Thank you for using Vaultrix. This is a system-generated invoice.', 50, 692, { align: 'center', width: 495 });
    doc.fillColor('#8b5cf6').fontSize(8).text('vaultrix.io  |  admin@vaultrix.io', 50, 706, { align: 'center', width: 495 });

    doc.end();
};

app.post('/invoices', async (req, res) => {
    try {
        const { orderId, userId, serviceId, serviceName, amount, address, scheduledDate } = req.body;
        if (!orderId || !userId || !serviceId || !serviceName || !amount)
            return err(res, 'Missing required fields');

        const existing = await Invoice.findOne({ orderId });
        if (existing) return ok(res, { invoice: existing });

        const invoice = await Invoice.create({ orderId, userId, serviceId, serviceName, amount, address, scheduledDate });
        ok(res, { invoice }, 201);
    } catch (e) {
        err(res, e.message, 500);
    }
});

app.get('/invoices/order/:orderId', async (req, res) => {
    try {
        const invoice = await loadInvoiceForOrder(req.params.orderId);
        ok(res, { invoice });
    } catch (e) {
        err(res, e.message, e.status || 500);
    }
});

app.get('/invoices/order/:orderId/download', async (req, res) => {
    try {
        const invoice = await loadInvoiceForOrder(req.params.orderId);
        streamInvoicePdf(res, invoice);
    } catch (e) {
        err(res, e.message, e.status || 500);
    }
});

app.get('/invoices/:id', async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) return err(res, 'Invoice not found', 404);
        ok(res, { invoice });
    } catch (e) {
        err(res, e.message, 500);
    }
});

app.get('/invoices/:id/download', async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) return err(res, 'Invoice not found', 404);
        streamInvoicePdf(res, invoice);
    } catch (e) {
        console.error('[invoice-service] PDF error:', e.message);
        err(res, e.message, 500);
    }
});

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'invoice-service' }));
app.listen(PORT, '0.0.0.0', () => console.log(`[invoice-service] running on port ${PORT}`));
