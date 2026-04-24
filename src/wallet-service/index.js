require('dotenv').config();
const connectDB = require('./config/db');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Wallet = require('./models/Wallet');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3003;

// MongoDB connection
connectDB();

app.post('/wallet/create', async (req, res) => {
    try {
        const { userId } = req.body;
        let wallet = await Wallet.findOne({ userId });
        if (wallet) return res.status(400).json({ error: 'Wallet already exists' });
        
        wallet = new Wallet({ userId, balance: 0 });
        await wallet.save();
        
        res.status(201).json(wallet);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.get('/wallet/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const wallet = await Wallet.findOne({ userId });
        if (!wallet) return res.status(404).json({ error: 'Wallet not found' });
        
        res.status(200).json({ userId, balance: wallet.balance, source: 'db' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/wallet/fund', async (req, res) => {
    try {
        const { userId, amount } = req.body;
        if (amount <= 0) return res.status(400).json({ error: 'Amount must be greater than zero' });

        const wallet = await Wallet.findOne({ userId });
        if (!wallet) return res.status(404).json({ error: 'Wallet not found' });

        wallet.balance += amount;
        await wallet.save();
        
        res.status(200).json(wallet);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.patch('/wallet/update', async (req, res) => {
    try {
        // Internal endpoint for deductions and credits by transaction service
        const { userId, amount } = req.body; // positive for credit, negative for debit
        const wallet = await Wallet.findOne({ userId });
        if (!wallet) return res.status(404).json({ error: 'Wallet not found' });

        if (wallet.balance + amount < 0) {
            return res.status(400).json({ error: 'Insufficient funds' });
        }

        wallet.balance += amount;
        await wallet.save();

        res.status(200).json(wallet);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'wallet-service', timestamp: new Date().toISOString() }));

app.listen(PORT, () => {
    console.log(`Wallet Service running on port ${PORT}`);
});
