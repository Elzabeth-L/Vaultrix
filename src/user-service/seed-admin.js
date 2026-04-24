/**
 * Admin Seed Script
 * Usage:  node seed-admin.js
 * Env:    MONGO_URI  (defaults to mongodb://localhost:27017/users_db)
 *         JWT_SECRET (defaults to vaultrix-super-secret-key)
 *         ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD
 *
 * Run inside Docker:
 *   docker-compose exec user-service node /app/seed-admin.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const MONGO_URI      = process.env.MONGO_URI      || 'mongodb://localhost:27017/users_db';
const ADMIN_NAME     = process.env.ADMIN_NAME     || 'Vaultrix Admin';
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'admin@vaultrix.io';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123!';

const userSchema = new mongoose.Schema({
  name:     String,
  email:    { type: String, unique: true },
  password: String,
  role:     { type: String, enum: ['customer', 'provider', 'admin'], default: 'customer' }
}, { timestamps: true });

async function seed() {
  await mongoose.connect(MONGO_URI);
  const User = mongoose.models.User || mongoose.model('User', userSchema);

  const existing = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });
  if (existing) {
    console.log(`Admin already exists: ${ADMIN_EMAIL}`);
    await mongoose.disconnect();
    return;
  }

  const hashed = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await new User({ name: ADMIN_NAME, email: ADMIN_EMAIL.toLowerCase(), password: hashed, role: 'admin' }).save();

  console.log(`✅ Admin created: ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  console.log(`   CHANGE THIS PASSWORD immediately after first login.`);
  await mongoose.disconnect();
}

seed().catch(e => { console.error(e.message); process.exit(1); });
