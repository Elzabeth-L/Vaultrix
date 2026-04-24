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

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'vaultrix-super-secret-key';
const WALLET_URL = process.env.WALLET_SERVICE_URL || 'http://127.0.0.1:3003';
const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || 'vaultrix-internal-token';

connectDB();

const ok = (res, data, status = 200) => res.status(status).json({ success: true, ...data });
const err = (res, message, status = 400) => res.status(status).json({ success: false, message });

const sanitizeUser = (user) => ({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
});

const verifyToken = (req, res, next) => {
    const h = req.headers.authorization;
    if (!h) return err(res, 'No token provided', 403);
    try {
        req.user = jwt.verify(h.replace('Bearer ', ''), JWT_SECRET);
        next();
    } catch {
        return err(res, 'Unauthorized', 401);
    }
};

const verifyInternalToken = (req, res, next) => {
    const token = req.headers['x-internal-token'];
    if (token !== INTERNAL_SERVICE_TOKEN) return err(res, 'Forbidden', 403);
    next();
};

const cleanupWallet = async (userId) => {
    if (typeof fetch !== 'function') return;

    try {
        await fetch(`${WALLET_URL}/wallet/${userId}`, { method: 'DELETE' });
    } catch (error) {
        console.error('[user-service] wallet cleanup failed:', error.message);
    }
};

// Register (public, USER/PROVIDER only)
app.post('/users/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        let { role } = req.body;

        if (role) role = role.toUpperCase();
        if (!['USER', 'PROVIDER'].includes(role)) role = 'USER';

        if (!name || !email || !password)
            return err(res, 'name, email and password are required');
        if (await User.findOne({ email: email.toLowerCase() }))
            return err(res, 'Email already registered');

        const user = await new User({
            name,
            email,
            password: await bcrypt.hash(password, 10),
            role,
        }).save();

        if (typeof fetch === 'function') {
            fetch(`${WALLET_URL}/wallet/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user._id.toString() }),
            }).catch((e) => console.error('[user-service] wallet auto-create failed:', e.message));
        } else {
            console.warn('[user-service] wallet auto-create skipped: fetch is not available in this Node runtime');
        }

        ok(res, { message: 'Registered successfully', userId: user._id }, 201);
    } catch (e) {
        if (e.name === 'ValidationError') {
            const messages = Object.values(e.errors).map((val) => val.message);
            return err(res, messages.join(', '));
        }
        err(res, e.message);
    }
});

// Login
app.post('/users/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const ADMIN_EMAIL = 'admin@vaultrix.io';
        const ADMIN_PASSWORD = 'Admin@Vaultrix123!';
        if (email?.toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
            const token = jwt.sign({ id: 'admin', role: 'ADMIN' }, JWT_SECRET, { expiresIn: '1d' });
            return ok(res, {
                token,
                user: { id: 'admin', name: 'Vaultrix Admin', email: ADMIN_EMAIL, role: 'ADMIN' },
            });
        }

        const user = await User.findOne({ email: email?.toLowerCase() });
        if (!user || !(await bcrypt.compare(password, user.password)))
            return err(res, 'Invalid email or password', 401);
        const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
        ok(res, { token, user: sanitizeUser(user) });
    } catch (e) {
        err(res, e.message, 500);
    }
});

// Internal user lookup for other services
app.get('/users/internal/:id', verifyInternalToken, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) return err(res, 'User not found', 404);
        ok(res, { user: sanitizeUser(user) });
    } catch (e) {
        err(res, e.message, 500);
    }
});

// Profile shortcut
app.get('/users/profile', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return err(res, 'User not found', 404);
        ok(res, { user: sanitizeUser(user) });
    } catch (e) {
        err(res, e.message, 500);
    }
});

// Public profile for the logged-in user or admin
app.get('/users/:id', verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN' && String(req.user.id) !== String(req.params.id))
            return err(res, 'Forbidden', 403);

        const user = await User.findById(req.params.id).select('-password');
        if (!user) return err(res, 'User not found', 404);
        ok(res, { user: sanitizeUser(user) });
    } catch (e) {
        err(res, e.message, 500);
    }
});

// Delete account
app.delete('/users/:id', verifyToken, async (req, res) => {
    try {
        if (req.params.id === 'admin' || req.user.id === 'admin')
            return err(res, 'The admin account cannot be deleted.', 403);
        if (req.user.role !== 'ADMIN' && String(req.user.id) !== String(req.params.id))
            return err(res, 'Forbidden', 403);

        const user = await User.findById(req.params.id);
        if (!user) return err(res, 'User not found', 404);

        await User.deleteOne({ _id: req.params.id });
        await cleanupWallet(req.params.id);

        ok(res, { message: 'Account deleted successfully.' });
    } catch (e) {
        err(res, e.message, 500);
    }
});

app.get('/health', (req, res) =>
    res.json({ status: 'ok', service: 'user-service', timestamp: new Date().toISOString() }));

app.listen(PORT, '0.0.0.0', () => console.log(`[user-service] running on port ${PORT}`));
