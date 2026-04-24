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

const buildInvoicePayload = (source = {}) => ({
    orderId: source._id || source.orderId,
    userId: source.userId,
    userName: source.userName,
    userEmail: source.userEmail,
    serviceId: source.serviceId,
    serviceName: source.serviceName,
    description: source.description,
    amount: Number(source.amount),
    address: source.address,
    scheduledDate: source.scheduledDate,
    paidAt: source.paidAt || source.updatedAt || new Date(),
});

const invoiceNeedsHydration = (invoice) => {
    if (!invoice) return false;
    return !invoice.userName || !invoice.userEmail || !invoice.description;
};

const createInvoiceFromOrder = async (order) => {
    if (!order) throw new Error('Order payload is required');

    const existing = await Invoice.findOne({ orderId: order._id || order.orderId });
    if (existing) return existing;

    return Invoice.create(buildInvoicePayload(order));
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

const hydrateInvoiceFromOrder = async (invoice, order) => {
    if (!invoice || !order) return invoice;

    let dirty = false;
    const updates = {
        userName: order.userName,
        userEmail: order.userEmail,
        description: order.description,
        serviceName: order.serviceName,
        address: order.address,
        scheduledDate: order.scheduledDate,
    };

    for (const [key, value] of Object.entries(updates)) {
        if (value && String(invoice[key] || '') !== String(value)) {
            invoice[key] = value;
            dirty = true;
        }
    }

    if (dirty) await invoice.save();
    return invoice;
};

const loadInvoiceForOrder = async (orderId) => {
    let invoice = await Invoice.findOne({ orderId });
    if (invoice && !invoiceNeedsHydration(invoice)) return invoice;

    if (invoice) {
        try {
            const order = await fetchOrderById(orderId);
            return hydrateInvoiceFromOrder(invoice, order);
        } catch (error) {
            console.error('[invoice-service] failed to enrich invoice from order:', error.message);
            return invoice;
        }
    }

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

    doc.fillColor('#94a3b8').fontSize(9).font('Helvetica').text('BILLED TO', 50, 235);
    doc.fillColor('#f1f5f9').fontSize(11).font('Helvetica-Bold').text(invoice.userName || 'Customer', 50, 249);
    doc.fillColor('#cbd5e1').fontSize(9).font('Helvetica').text(invoice.userEmail || '-', 50, 265);
    doc.fillColor('#94a3b8').fontSize(9).font('Helvetica').text('CUSTOMER ID', 320, 235);
    doc.fillColor('#f1f5f9').fontSize(10).font('Helvetica').text(invoice.userId || '-', 320, 249, { width: 210 });

    doc.moveTo(50, 295).lineTo(545, 295).strokeColor('#2d2d3d').lineWidth(1).stroke();
    doc.fillColor('#94a3b8').fontSize(9).font('Helvetica').text('SERVICE DETAILS', 50, 310);
    doc.moveTo(50, 323).lineTo(545, 323).strokeColor('#2d2d3d').lineWidth(0.5).stroke();

    doc.fillColor('#8b5cf6').fontSize(9).font('Helvetica-Bold');
    doc.text('SERVICE', 50, 335);
    doc.text('ADDRESS', 210, 335);
    doc.text('SCHEDULED DATE', 370, 335);
    doc.text('AMOUNT', 490, 335, { align: 'right' });
    doc.moveTo(50, 349).lineTo(545, 349).strokeColor('#2d2d3d').lineWidth(0.5).stroke();

    doc.fillColor('#f1f5f9').fontSize(10).font('Helvetica');
    doc.text(invoice.serviceName || invoice.serviceId, 50, 361, { width: 150 });
    doc.text(invoice.address || '-', 210, 361, { width: 145 });
    const schedDate = invoice.scheduledDate ? new Date(invoice.scheduledDate).toLocaleDateString('en-IN') : '-';
    doc.text(schedDate, 370, 361, { width: 110 });
    doc.fillColor('#10b981').fontSize(12).font('Helvetica-Bold');
    doc.text(`$${Number(invoice.amount).toFixed(2)}`, 490, 359, { align: 'right' });

    doc.fillColor('#94a3b8').fontSize(9).font('Helvetica').text('SERVICE DESCRIPTION', 50, 405);
    doc.fillColor('#f1f5f9').fontSize(10).font('Helvetica').text(invoice.description || 'Professional service booking', 50, 419, {
        width: 495,
        height: 55,
    });

    doc.rect(350, 500, 195, 55).fill('#1e1e2e');
    doc.fillColor('#94a3b8').fontSize(9).font('Helvetica').text('TOTAL AMOUNT PAID', 365, 512);
    doc.fillColor('#10b981').fontSize(20).font('Helvetica-Bold').text(`$${Number(invoice.amount).toFixed(2)}`, 365, 527);

    doc.moveTo(50, 680).lineTo(545, 680).strokeColor('#2d2d3d').lineWidth(1).stroke();
    doc.fillColor('#94a3b8').fontSize(8).font('Helvetica').text('Thank you for using Vaultrix. This is a system-generated invoice.', 50, 692, { align: 'center', width: 495 });
    doc.fillColor('#8b5cf6').fontSize(8).text('vaultrix.io  |  admin@vaultrix.io', 50, 706, { align: 'center', width: 495 });

    doc.end();
};

app.post('/invoices', async (req, res) => {
    try {
        const { orderId, userId, serviceId, serviceName, amount } = req.body;
        if (!orderId || !userId || !serviceId || !serviceName || !amount)
            return err(res, 'Missing required fields');

        const existing = await Invoice.findOne({ orderId });
        if (existing) return ok(res, { invoice: existing });

        const invoice = await Invoice.create(buildInvoicePayload(req.body));
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
        let invoice = await Invoice.findById(req.params.id);
        if (!invoice) return err(res, 'Invoice not found', 404);
        if (invoiceNeedsHydration(invoice)) {
            try {
                const order = await fetchOrderById(invoice.orderId);
                invoice = await hydrateInvoiceFromOrder(invoice, order);
            } catch (error) {
                console.error('[invoice-service] failed to enrich invoice by id:', error.message);
            }
        }
        ok(res, { invoice });
    } catch (e) {
        err(res, e.message, 500);
    }
});

app.get('/invoices/:id/download', async (req, res) => {
    try {
        let invoice = await Invoice.findById(req.params.id);
        if (!invoice) return err(res, 'Invoice not found', 404);
        if (invoiceNeedsHydration(invoice)) {
            try {
                const order = await fetchOrderById(invoice.orderId);
                invoice = await hydrateInvoiceFromOrder(invoice, order);
            } catch (error) {
                console.error('[invoice-service] failed to enrich invoice PDF payload:', error.message);
            }
        }
        streamInvoicePdf(res, invoice);
    } catch (e) {
        console.error('[invoice-service] PDF error:', e.message);
        err(res, e.message, 500);
    }
});

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'invoice-service' }));
app.listen(PORT, '0.0.0.0', () => console.log(`[invoice-service] running on port ${PORT}`));
