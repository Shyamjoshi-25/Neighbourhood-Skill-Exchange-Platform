import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';

const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const password = String(process.env.ADMIN_PASSWORD || '');
const name = process.env.ADMIN_NAME || 'Platform Admin';

async function run() {
  if (!email || !password) {
    console.error('ADMIN_EMAIL or ADMIN_PASSWORD is missing in backend/.env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected');

  const hash = await bcrypt.hash(password, 12);
  const admin = await User.findOneAndUpdate(
    { email },
    {
      $set: { name, password: hash, role: 'admin', verified: true, isBlocked: false },
      $setOnInsert: { area: 'Platform', city: 'Nashik', skills: [], availability: 'Available' },
    },
    { upsert: true, new: true }
  );

  console.log(`Admin ready: ${admin.email} (role: ${admin.role})`);
  console.log('Log in with this email and the ADMIN_PASSWORD value from backend/.env');
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});