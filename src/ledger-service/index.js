require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const redis = require('redis');
const cors = require('cors');
const Ledger = require('./models/Ledger');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3005;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27021/ledger_db';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

mongoose.connect(MONGO_URI)
    .then(() => console.log('Connected to Ledger MongoDB'))
    .catch(err => console.error('Failed to connect to MongoDB', err));

const redisSubscriber = redis.createClient({ url: REDIS_URL });

redisSubscriber.connect()
    .then(() => {
        console.log('Connected to Redis Subscriber');
        
        redisSubscriber.subscribe('transaction.completed', async (message) => {
            try {
                const data = JSON.parse(message);
                const { transactionId, orderId, clientId, providerId, amount } = data;
                
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
            } catch (error) {
                console.error('Error processing ledger event:', error);
            }
        });
    })
    .catch(err => console.error('Redis connection error', err));

app.get('/ledger/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const entries = await Ledger.find({ userId }).sort({ createdAt: -1 });
        res.status(200).json(entries);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'ledger-service' }));

app.listen(PORT, () => {
    console.log(`Ledger Service running on port ${PORT}`);
});
