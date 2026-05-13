import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { User } from '../models/User.js';
import { Otp } from '../models/Otp.js';
import { authenticate } from '../middleware/auth.js';
import { sendOtpEmail } from '../services/emailService.js';
import { config } from '../config/index.js';

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { message: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

function signToken(userId) {
  return jwt.sign({ userId }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

function setCsrfCookie(res) {
  const csrfToken = crypto.randomBytes(32).toString('hex');
  res.cookie('csrf-token', csrfToken, { httpOnly: false, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: 'lax' });
  return csrfToken;
}

// POST /api/auth/register
router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const { email, password, username, displayName } = req.body;
    const emailNorm = (email || '').trim().toLowerCase();
    if (!emailNorm || !password || !username) {
      return res.status(400).json({ message: 'Email, password, and username are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({ message: 'Password must contain uppercase, lowercase, and a number' });
    }
    const existing = await User.findOne({ $or: [{ email: emailNorm }, { username }] });
    if (existing) {
      return res.status(400).json({ message: existing.email === emailNorm ? 'Email already registered' : 'Username taken' });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      email: emailNorm,
      passwordHash,
      username,
      displayName: displayName || username,
    });
    const token = signToken(user._id);
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: 'lax' });
    setCsrfCookie(res);
    const u = await User.findById(user._id).select('-passwordHash');
    res.status(201).json({ user: u, accessToken: token });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const token = signToken(user._id);
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: 'lax' });
    setCsrfCookie(res);
    const u = await User.findById(user._id).select('-passwordHash');
    res.json({ user: u, accessToken: token });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json(req.user);
});

// POST /api/auth/forgot-password — send OTP to email
router.post('/forgot-password', async (req, res, next) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal whether email exists
      return res.json({ message: 'If that email is registered, a reset code has been sent.' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await Otp.deleteMany({ email });
    await Otp.create({ email, otp, expiresAt: new Date(Date.now() + 10 * 60 * 1000) });

    await sendOtpEmail(email, otp);
    res.json({ message: 'If that email is registered, a reset code has been sent.' });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/reset-password — verify OTP and set new password
router.post('/reset-password', async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    const emailNorm = (email || '').trim().toLowerCase();

    if (!emailNorm || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP, and new password are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    const record = await Otp.findOne({ email: emailNorm, otp });
    if (!record || record.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired reset code' });
    }

    const user = await User.findOne({ email: emailNorm });
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();
    await Otp.deleteMany({ email: emailNorm });

    res.json({ message: 'Password reset successfully. You can now sign in.' });
  } catch (err) {
    next(err);
  }
});

export default router;
