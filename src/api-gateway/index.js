require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(morgan('dev'));

// Routing map
const services = {
    '/users': process.env.USER_SERVICE_URL || 'http://localhost:3001',
    '/orders': process.env.ORDER_SERVICE_URL || 'http://localhost:3002',
    '/wallet': process.env.WALLET_SERVICE_URL || 'http://localhost:3003',
    '/transactions': process.env.TRANSACTION_SERVICE_URL || 'http://localhost:3004',
    '/ledger': process.env.LEDGER_SERVICE_URL || 'http://localhost:3005'
};

// Setup proxies
for (const [path, target] of Object.entries(services)) {
    app.use(path, createProxyMiddleware({
        target,
        changeOrigin: true,
        pathRewrite: {
            // Keep the path intact so /users/1 goes to target/users/1
            // We just proxy the request. Actually we want /users to map to /users on target.
            // But if the target is just http://localhost:3001 without /users, 
            // then we should just let the path pass through.
            // If the target app handles /users, we don't need pathRewrite.
        }
    }));
}

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'api-gateway' }));

app.listen(PORT, () => {
    console.log(`API Gateway is running on port ${PORT}`);
});
