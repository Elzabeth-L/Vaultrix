require('dotenv').config();
const connectDB = require('./config/db');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Ledger = require('./models/Ledger');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3005;

connectDB();

app.post('/ledger/log', async (req, res) => {
    try {
        const { transactionId, orderId, clientId, providerId, amount } = req.body;
        
        // Log DEBIT for client
        await new Ledger({
            transactionId,
            orderId,
            userId: clientId,
            type: 'DEBIT',
            amount,
            description: `₹${amount} settled from client to provider`
        }).save();

        // Log CREDIT for provider
        await new Ledger({
            transactionId,
            orderId,
            userId: providerId,
            type: 'CREDIT',
            amount,
            description: `₹${amount} settled from client to provider`
        }).save();

        console.log(`Audit log created for transaction ${transactionId}`);
        res.status(200).json({ status: 'success' });
    } catch (error) {
        console.error('Error processing ledger event:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/ledger/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const entries = await Ledger.find({ userId }).sort({ createdAt: -1 });
        res.status(200).json(entries);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'ledger-service', timestamp: new Date().toISOString() }));

app.listen(PORT, () => {
    console.log(`Ledger Service running on port ${PORT}`);
});
