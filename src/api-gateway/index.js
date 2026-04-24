require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(morgan('dev'));

// Service routing map — prefix → target base URL
const services = {
    '/users':        process.env.USER_SERVICE_URL        || 'http://user-service:3001',
    '/orders':       process.env.ORDER_SERVICE_URL       || 'http://order-service:3002',
    '/wallet':       process.env.WALLET_SERVICE_URL      || 'http://wallet-service:3003',
    '/transactions': process.env.TRANSACTION_SERVICE_URL || 'http://transaction-service:3004',
    '/ledger':       process.env.LEDGER_SERVICE_URL      || 'http://ledger-service:3005',
    '/bookings':     process.env.BOOKING_SERVICE_URL     || 'http://booking-service:3006',
    '/marketplace':  process.env.MARKETPLACE_SERVICE_URL || 'http://marketplace-service:3007',
};

for (const [prefix, target] of Object.entries(services)) {
    app.use(
        prefix,
        createProxyMiddleware({
            target,
            changeOrigin: true,

            // When Express mounts on `/users`, it strips that prefix before
            // calling the middleware. pathReq here is already relative
            // (e.g. "/" or "/:id"), so we just reattach the original prefix.
            pathRewrite: (pathReq) => `${prefix}${pathReq}`,

            on: {
                proxyReq: (proxyReq, req) => {
                    console.log(`[GW] ${req.method} ${prefix}${req.url} → ${target}`);
                },
                error: (err, req, res) => {
                    console.error('[GW] Proxy error:', err.message);
                    res.status(502).json({ error: 'Bad gateway', detail: err.message });
                },
            },
        })
    );
}

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'api-gateway', timestamp: new Date().toISOString() }));

// Bind to 0.0.0.0 so Docker exposes the port correctly
app.listen(PORT || 3000, '0.0.0.0', () => {
    console.log(`API Gateway running on port ${PORT || 3000}`);
});
