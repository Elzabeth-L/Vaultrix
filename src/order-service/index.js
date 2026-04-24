require('dotenv').config();
const connectDB = require('./config/db');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Order = require('./models/Order');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3002;

connectDB();

app.post('/orders', async (req, res) => {
    try {
        const { title, description, clientId, amount } = req.body;
        const order = new Order({ title, description, clientId, amount });
        await order.save();
        res.status(201).json(order);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.get('/orders', async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/orders/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.status(200).json(order);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.patch('/orders/:id/assign', async (req, res) => {
    try {
        const { providerId } = req.body;
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        
        if (order.status !== 'CREATED') {
            return res.status(400).json({ error: `Cannot assign order in ${order.status} status` });
        }

        order.providerId = providerId;
        order.status = 'ASSIGNED';
        await order.save();
        res.status(200).json(order);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.patch('/orders/:id/complete', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        
        if (order.status !== 'ASSIGNED') {
            return res.status(400).json({ error: `Cannot complete order in ${order.status} status` });
        }

        order.status = 'COMPLETED';
        await order.save();
        res.status(200).json(order);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Settlement is usually done by transaction service updating the order status directly,
// or by sending a request here. Let's provide a /settle endpoint for internal use.
app.patch('/orders/:id/settle', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        
        if (order.status !== 'COMPLETED') {
            return res.status(400).json({ error: `Cannot settle order in ${order.status} status` });
        }

        order.status = 'SETTLED';
        await order.save();
        res.status(200).json(order);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'order-service' }));

app.listen(PORT, () => {
    console.log(`Order Service running on port ${PORT}`);
});
