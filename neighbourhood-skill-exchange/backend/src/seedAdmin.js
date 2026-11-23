import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDB } from './config/db.js';
import User from './models/User.js';

if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD in backend/.env before seeding.');
  process.exit(1);
}
if (process.env.ADMIN_PASSWORD.length < 12) {
  console.error('ADMIN_PASSWORD must be at least 12 characters.');
  process.exit(1);
}

try {
  await connectDB();
  const email = process.env.ADMIN_EMAIL.trim().toLowerCase();
  const exists = await User.findOne({ email });
  if (exists) {
    console.log('An account with this admin email already exists; no changes made.');
    process.exit(0);
  }
  const password = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
  await User.create({
    name: process.env.ADMIN_NAME || 'Platform Admin',
    email,
    password,
    area: 'Platform',
    role: 'admin',
    verified: true
  });
  console.log(`Admin created: ${email}`);
  process.exit(0);
} catch (error) {
  console.error('Could not create admin:', error.message);
  process.exit(1);
}
