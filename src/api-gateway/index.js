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
// Routing map
const services = {
    '/users': 'http://127.0.0.1:3001'
};
for (const [path, target] of Object.entries(services)) {
    app.use(path, createProxyMiddleware({
        target,
        changeOrigin: true,

        pathRewrite: (pathReq, req) => {
            return path + pathReq; // 🔥 reattach /users
        },

        logLevel: 'debug',

        onProxyReq: (proxyReq, req, res) => {
            console.log(`FORWARDING TO: ${target}${path}${req.url}`);
        },

        onError: (err, req, res) => {
            console.error('Proxy Error:', err.message);
            res.status(500).json({ error: 'Gateway error' });
        }
    }));
}

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'api-gateway' }));

app.listen(PORT, () => {
    console.log(`API Gateway is running on port ${PORT}`);
});
