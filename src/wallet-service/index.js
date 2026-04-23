require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const redis = require('redis');
const cors = require('cors');
const Wallet = require('./models/Wallet');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3003;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27019/wallet_db';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// MongoDB connection
mongoose.connect(MONGO_URI)
    .then(() => console.log('Connected to Wallet MongoDB'))
    .catch(err => console.error('Failed to connect to MongoDB', err));

// Redis connection
const redisClient = redis.createClient({ url: REDIS_URL });
redisClient.connect()
    .then(() => console.log('Connected to Redis'))
    .catch(err => console.error('Redis connection error', err));

app.post('/wallet/create', async (req, res) => {
    try {
        const { userId } = req.body;
        let wallet = await Wallet.findOne({ userId });
        if (wallet) return res.status(400).json({ error: 'Wallet already exists' });
        
        wallet = new Wallet({ userId, balance: 0 });
        await wallet.save();
        await redisClient.set(`wallet:${userId}`, 0);
        
        res.status(201).json(wallet);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.get('/wallet/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Try cache first
        const cachedBalance = await redisClient.get(`wallet:${userId}`);
        if (cachedBalance !== null) {
            return res.status(200).json({ userId, balance: parseFloat(cachedBalance), source: 'cache' });
        }

        const wallet = await Wallet.findOne({ userId });
        if (!wallet) return res.status(404).json({ error: 'Wallet not found' });
        
        // Set cache
        await redisClient.set(`wallet:${userId}`, wallet.balance);
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
        
        // Update cache
        await redisClient.set(`wallet:${userId}`, wallet.balance);
        
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

        await redisClient.set(`wallet:${userId}`, wallet.balance);

        res.status(200).json(wallet);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'wallet-service' }));

app.listen(PORT, () => {
    console.log(`Wallet Service running on port ${PORT}`);
});
