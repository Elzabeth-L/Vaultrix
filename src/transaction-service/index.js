require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const redis = require('redis');
const cors = require('cors');
const axios = require('axios');
const Transaction = require('./models/Transaction');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3004;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27020/transaction_db';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Service URLs for inter-service communication
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:3002';
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';
const WALLET_SERVICE_URL = process.env.WALLET_SERVICE_URL || 'http://localhost:3003';

mongoose.connect(MONGO_URI)
    .then(() => console.log('Connected to Transaction MongoDB'))
    .catch(err => console.error('Failed to connect to MongoDB', err));

const redisPublisher = redis.createClient({ url: REDIS_URL });
redisPublisher.connect()
    .then(() => console.log('Connected to Redis Publisher'))
    .catch(err => console.error('Redis connection error', err));

app.post('/transactions/execute', async (req, res) => {
    const { orderId } = req.body;
    
    if (!orderId) {
        return res.status(400).json({ error: 'orderId is required' });
    }

    try {
        // 1. Validate Order
        let order;
        try {
            const orderRes = await axios.get(`${ORDER_SERVICE_URL}/orders/${orderId}`);
            order = orderRes.data;
        } catch (err) {
            return res.status(404).json({ error: 'Order not found' });
        }

        if (order.status !== 'COMPLETED') {
            return res.status(400).json({ error: `Order must be COMPLETED, currently ${order.status}` });
        }

        const { clientId, providerId, amount } = order;

        // Create transaction record INITIATED
        const transaction = new Transaction({
            orderId,
            clientId,
            providerId,
            amount,
            status: 'INITIATED'
        });
        await transaction.save();

        // 2. Validate Users
        try {
            await axios.get(`${USER_SERVICE_URL}/users/${clientId}`);
            await axios.get(`${USER_SERVICE_URL}/users/${providerId}`);
        } catch (err) {
            transaction.status = 'FAILED';
            transaction.errorReason = 'User validation failed';
            await transaction.save();
            return res.status(400).json({ error: 'Invalid users associated with order' });
        }

        // 3. Deduct & Credit Wallets (Orchestration)
        try {
            // Deduct from client
            await axios.patch(`${WALLET_SERVICE_URL}/wallet/update`, {
                userId: clientId,
                amount: -amount
            });

            // Credit to provider
            await axios.patch(`${WALLET_SERVICE_URL}/wallet/update`, {
                userId: providerId,
                amount: amount
            });
        } catch (err) {
            // Rollback could be implemented here for real systems, we keep it simple
            transaction.status = 'FAILED';
            transaction.errorReason = 'Wallet update failed (insufficient funds?)';
            await transaction.save();
            return res.status(400).json({ error: transaction.errorReason });
        }

        // 4. Update order to SETTLED
        try {
            await axios.patch(`${ORDER_SERVICE_URL}/orders/${orderId}/settle`);
        } catch (err) {
            console.error('Failed to settle order, but funds transferred', err.message);
            // In a real system we would retry or log inconsistency
        }

        // 5. Update transaction to SUCCESS
        transaction.status = 'SUCCESS';
        await transaction.save();

        // 6. Publish event "transaction.completed"
        const eventPayload = JSON.stringify({
            transactionId: transaction._id,
            orderId,
            clientId,
            providerId,
            amount,
            timestamp: new Date()
        });
        await redisPublisher.publish('transaction.completed', eventPayload);

        res.status(200).json(transaction);

    } catch (error) {
        console.error('Transaction execution error', error);
        res.status(500).json({ error: 'Internal server error during transaction' });
    }
});

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'transaction-service' }));

app.listen(PORT, () => {
    console.log(`Transaction Service running on port ${PORT}`);
});
