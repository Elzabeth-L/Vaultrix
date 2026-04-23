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
    // '/orders': process.env.ORDER_SERVICE_URL || 'http://localhost:3002',
    // '/wallet': process.env.WALLET_SERVICE_URL || 'http://localhost:3003',
    // '/transactions': process.env.TRANSACTION_SERVICE_URL || 'http://localhost:3004',
    // '/ledger': process.env.LEDGER_SERVICE_URL || 'http://localhost:3005',
    // '/auth': process.env.AUTH_SERVICE_URL || 'http://localhost:5001'
};

// Setup proxies
for (const [path, target] of Object.entries(services)) {
    app.use(path, createProxyMiddleware({
        target,
        changeOrigin: true,

        // 🔥 important: keep path intact
        pathRewrite: {
            [`^${path}`]: path
        },

        logLevel: 'debug',

        onError: (err, req, res) => {
            console.error(`[API Gateway] Error on ${path}:`, err.message);

            res.status(500).json({
                error: 'Gateway error',
                message: err.message,
                service: target
            });
        },

        onProxyReq: (proxyReq, req, res) => {
            console.log(`[API Gateway] ${req.method} ${req.url} → ${target}`);
        }
    }));
}

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'api-gateway' }));

app.listen(PORT, () => {
    console.log(`API Gateway is running on port ${PORT}`);
});
