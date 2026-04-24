require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(morgan('dev'));

// Service routing map — prefix (Gateway) → target base URL (Microservice)
const services = {
    '/api/users':    process.env.USER_SERVICE_URL    || 'http://localhost:3001',
    '/api/orders':   process.env.ORDER_SERVICE_URL   || 'http://localhost:3002',
    '/api/wallet':   process.env.WALLET_SERVICE_URL  || 'http://localhost:3003',
    '/api/invoices': process.env.INVOICE_SERVICE_URL || 'http://localhost:3005',
    '/api/reviews':  process.env.REVIEW_SERVICE_URL  || 'http://localhost:3006',
};

for (const [prefix, target] of Object.entries(services)) {
    app.use(
        prefix,
        createProxyMiddleware({
            target,
            changeOrigin: true,
            // Express strips the mounted prefix (e.g., '/api/users'). 
            // pathReq is the remaining path (e.g., '/login').
            // We need to send it to the target service as '/users/login'.
            pathRewrite: (pathReq) => {
                const targetPrefix = prefix.replace('/api', ''); // e.g., '/users'
                return `${targetPrefix}${pathReq}`;
            },
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

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'api-gateway', timestamp: new Date().toISOString() }));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`[api-gateway] running on port ${PORT}`);
});
