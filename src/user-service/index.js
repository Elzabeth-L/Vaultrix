require('dotenv').config();
const connectDB  = require('./config/db');
const express    = require('express');
const cors       = require('cors');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const User       = require('./models/User');

const app = express();
app.use(cors());
app.use(express.json());

const PORT       = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'vaultrix-super-secret-key';
const WALLET_URL = process.env.WALLET_SERVICE_URL || 'http://wallet-service:3003';

connectDB();

const ok  = (res, data, status = 200) => res.status(status).json({ success: true, ...data });
const err = (res, message, status = 400) => res.status(status).json({ success: false, message });

const verifyToken = (req, res, next) => {
    const h = req.headers['authorization'];
    if (!h) return err(res, 'No token provided', 403);
    try { req.user = jwt.verify(h.replace('Bearer ', ''), JWT_SECRET); next(); }
    catch { return err(res, 'Unauthorized', 401); }
};

// ── Register (public, USER/PROVIDER only) ──────────────────────────────────
app.post('/users/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        let { role } = req.body;
        
        // Convert to uppercase and validate
        if (role) role = role.toUpperCase();
        if (!['USER', 'PROVIDER'].includes(role)) role = 'USER';
        
        if (!name || !email || !password)
            return err(res, 'name, email and password are required');
        if (await User.findOne({ email: email.toLowerCase() }))
            return err(res, 'Email already registered');

        const user = await new User({ name, email, password: await bcrypt.hash(password, 10), role }).save();

        // Auto-create wallet (non-blocking)
        fetch(`${WALLET_URL}/wallet/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user._id.toString() })
        }).catch(e => console.error('[user-service] wallet auto-create failed:', e.message));

        ok(res, { message: 'Registered successfully', userId: user._id }, 201);
    } catch (e) { 
        if (e.name === 'ValidationError') {
            const messages = Object.values(e.errors).map(val => val.message);
            return err(res, messages.join(', '));
        }
        err(res, e.message); 
    }
});

// ── Login ──────────────────────────────────────────────────────────────────────
app.post('/users/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email: email?.toLowerCase() });
        if (!user || !(await bcrypt.compare(password, user.password)))
            return err(res, 'Invalid email or password', 401);
        const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
        ok(res, { token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
    } catch (e) { err(res, e.message, 500); }
});

// ── Profile ────────────────────────────────────────────────────────────────────
app.get('/users/profile', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return err(res, 'User not found', 404);
        ok(res, { user });
    } catch (e) { err(res, e.message, 500); }
});

app.get('/health', (req, res) =>
    res.json({ status: 'ok', service: 'user-service', timestamp: new Date().toISOString() }));

app.listen(PORT, '0.0.0.0', () => console.log(`[user-service] running on port ${PORT}`));
