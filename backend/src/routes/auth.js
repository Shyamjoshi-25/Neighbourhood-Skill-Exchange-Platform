import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = Router();

// bcryptjs is pure JS; cost 12 takes 1-3s on serverless CPUs. 10 is still secure and ~4x faster.
const ROUNDS = 10;

const safeUser = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
  area: u.area,
  city: u.city,
  profession: u.profession,
  skills: u.skills,
  bio: u.bio,
  availability: u.availability,
  verified: u.verified,
  contactPreference: u.contactPreference,
});

const tokenFor = (u) =>
  jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

router.post('/register', async (req, res) => {
  try {
    const { name, password, area, city, profession, skills, bio, availability } = req.body;
    const email = String(req.body.email || '').trim().toLowerCase();

    if (!name || !email || !password || !area)
      return res.status(400).json({ message: 'Name, email, password, and neighbourhood are required.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    if (typeof password !== 'string')
      return res.status(400).json({ message: 'Invalid password.' });
    if (skills !== undefined && !Array.isArray(skills))
      return res.status(400).json({ message: 'Skills must be a list.' });
    if (password.length < 8)
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    if (await User.findOne({ email }))
      return res.status(409).json({ message: 'An account with this email already exists.' });

    const hash = await bcrypt.hash(password, ROUNDS);
    const wantsSkills = Boolean(profession || skills?.length);
    const user = await User.create({
      name,
      email,
      password: hash,
      area,
      city,
      profession: profession || '',
      skills: skills || [],
      bio: bio || '',
      availability: availability || 'Available',
      role: wantsSkills ? 'skilled_member' : 'user',
    });

    res.status(201).json({ token: tokenFor(user), user: safeUser(user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Registration failed.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: String(email || '').trim().toLowerCase() });

    if (!user || !(await bcrypt.compare(String(password || ''), user.password)))
      return res.status(401).json({ message: 'Incorrect email or password.' });
    if (user.isBlocked)
      return res.status(403).json({ message: 'Your account is suspended. Contact support.' });

    res.json({ token: tokenFor(user), user: safeUser(user) });

    // Old accounts were hashed with cost 12 (slow). Upgrade them after responding.
    if (bcrypt.getRounds(user.password) > ROUNDS) {
      bcrypt.hash(String(password), ROUNDS)
        .then((h) => User.updateOne({ _id: user._id }, { password: h }))
        .catch(() => {});
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Login failed.' });
  }
});

router.get('/me', protect, (req, res) => res.json({ user: safeUser(req.user) }));

router.put('/me', protect, async (req, res) => {
  try {
    const allowed = ['name', 'area', 'city', 'profession', 'skills', 'bio', 'availability', 'contactPreference'];
    if (req.body.skills !== undefined && !Array.isArray(req.body.skills))
      return res.status(400).json({ message: 'Skills must be a list.' });

    allowed.forEach((k) => {
      if (req.body[k] !== undefined) req.user[k] = req.body[k];
    });

    if (req.user.role !== 'admin')
      req.user.role = req.user.profession || req.user.skills?.length ? 'skilled_member' : 'user';

    await req.user.save();
    res.json({ user: safeUser(req.user) });
  } catch (e) {
    console.error(e);
    res.status(400).json({ message: 'Profile update failed.' });
  }
});

router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string')
      return res.status(400).json({ message: 'Current and new password are required.' });
    if (newPassword.length < 8)
      return res.status(400).json({ message: 'New password must be at least 8 characters.' });

    // Load the user again in case protect() hides the password field
    const user = await User.findById(req.user._id);
    if (!user || !(await bcrypt.compare(currentPassword, user.password)))
      return res.status(401).json({ message: 'Current password is incorrect.' });
    if (await bcrypt.compare(newPassword, user.password))
      return res.status(400).json({ message: 'New password must be different from the current one.' });

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();
    res.json({ message: 'Password changed successfully.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Could not change password.' });
  }
});

export default router;