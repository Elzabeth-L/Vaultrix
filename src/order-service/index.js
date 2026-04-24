require('dotenv').config();
const connectDB = require('./config/db');
const express   = require('express');
const cors      = require('cors');
const Order     = require('./models/Order');

const app  = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3002;
connectDB();

const ok  = (res, data, status = 200) => res.status(status).json({ success: true, ...data });
const err = (res, message, status = 400) => res.status(status).json({ success: false, message });

// ── POST /orders — User submits a service request ──────────────────────────
app.post('/orders', async (req, res) => {
    try {
        const { userId, serviceId, serviceName, description, address, scheduledDate, amount } = req.body;
        if (!userId || !serviceId || !serviceName || !description || !address || !scheduledDate || !amount)
            return err(res, 'userId, serviceId, serviceName, description, address, scheduledDate, and amount are required');

        const order = await Order.create({
            userId, serviceId, serviceName, description, address,
            scheduledDate: new Date(scheduledDate),
            amount: Number(amount)
        });
        ok(res, { order }, 201);
    } catch (e) { err(res, e.message, 500); }
});

// ── GET /orders — Query orders (userId, status, providerId filter) ──────────
app.get('/orders', async (req, res) => {
    try {
        const filter = {};
        if (req.query.userId)  filter.userId  = req.query.userId;
        if (req.query.status)  filter.status  = req.query.status;
        const orders = await Order.find(filter).sort({ createdAt: -1 });
        ok(res, { orders });
    } catch (e) { err(res, e.message, 500); }
});

// ── GET /orders/:id — Single order ─────────────────────────────────────────
app.get('/orders/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return err(res, 'Order not found', 404);
        ok(res, { order });
    } catch (e) { err(res, e.message, 400); }
});

// ── PATCH /orders/:id/approve — Admin approves ─────────────────────────────
app.patch('/orders/:id/approve', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return err(res, 'Order not found', 404);
        if (order.status !== 'PENDING') return err(res, `Cannot approve an order with status ${order.status}`);
        order.status = 'APPROVED';
        await order.save();
        ok(res, { order });
    } catch (e) { err(res, e.message, 500); }
});

// ── PATCH /orders/:id/reject — Admin rejects ──────────────────────────────
app.patch('/orders/:id/reject', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return err(res, 'Order not found', 404);
        if (order.status !== 'PENDING') return err(res, `Cannot reject an order with status ${order.status}`);
        order.status = 'REJECTED';
        order.rejectionReason = req.body.reason || '';
        await order.save();
        ok(res, { order });
    } catch (e) { err(res, e.message, 500); }
});

// ── PATCH /orders/:id/pay — Internal: wallet-service calls this after payment
app.patch('/orders/:id/pay', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return err(res, 'Order not found', 404);
        if (order.status !== 'APPROVED') return err(res, 'Order must be APPROVED before payment');
        if (order.paymentStatus === 'PAID') return err(res, 'Order already paid');
        order.paymentStatus = 'PAID';
        await order.save();
        ok(res, { order });
    } catch (e) { err(res, e.message, 500); }
});

// ── PATCH /orders/:id/complete — Admin marks complete ─────────────────────
app.patch('/orders/:id/complete', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return err(res, 'Order not found', 404);
        if (order.status !== 'APPROVED') return err(res, 'Order must be APPROVED to complete');
        if (order.paymentStatus !== 'PAID') return err(res, 'Order must be PAID before marking complete');
        order.status = 'COMPLETED';
        await order.save();
        ok(res, { order });
    } catch (e) { err(res, e.message, 500); }
});

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'order-service' }));
app.listen(PORT, '0.0.0.0', () => console.log(`[order-service] running on port ${PORT}`));
