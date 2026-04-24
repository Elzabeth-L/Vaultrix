require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(morgan('dev'));

// Service routing map — prefix → target base URL
const services = {
    '/users':    process.env.USER_SERVICE_URL    || 'http://user-service:3001',
    '/orders':   process.env.ORDER_SERVICE_URL   || 'http://order-service:3002',
    '/wallet':   process.env.WALLET_SERVICE_URL  || 'http://wallet-service:3003',
    '/invoices': process.env.INVOICE_SERVICE_URL || 'http://invoice-service:3005',
    '/reviews':  process.env.REVIEW_SERVICE_URL  || 'http://review-service:3006',
};

for (const [prefix, target] of Object.entries(services)) {
    app.use(
        prefix,
        createProxyMiddleware({
            target,
            changeOrigin: true,
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

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'api-gateway', timestamp: new Date().toISOString() }));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`[api-gateway] running on port ${PORT}`);
});
