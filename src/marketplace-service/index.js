require('dotenv').config();
const connectDB = require('./config/db');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3005;

connectDB();

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'marketplace-service' }));

app.listen(PORT, () => {
    console.log(`Marketplace Service running on port ${PORT}`);
});
