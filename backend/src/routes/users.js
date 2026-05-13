import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { User } from '../models/User.js';
import { Submission } from '../models/Submission.js';
import { Room } from '../models/Room.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* ── Multer setup for avatar uploads ── */
const uploadsDir = path.join(__dirname, '../../uploads/avatars');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${req.user._id}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only image files (jpg, png, gif, webp) are allowed'));
  },
});

/**
 * GET /api/users/me — current user profile + stats
 */
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-passwordHash').lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Aggregate stats from DB
    const [totalSubmissions, acceptedSubmissions, totalRooms] = await Promise.all([
      Submission.countDocuments({ userId: req.user._id }),
      Submission.countDocuments({ userId: req.user._id, 'result.status': 'ac' }),
      Room.countDocuments({ 'participants.userId': req.user._id }),
    ]);

    // Unique problems solved
    const solvedProblems = await Submission.distinct('problemId', {
      userId: req.user._id,
      'result.status': 'ac',
    });

    res.json({
      ...user,
      stats: {
        totalSubmissions,
        acceptedSubmissions,
        totalRooms,
        problemsSolved: solvedProblems.length,
        acceptRate: totalSubmissions > 0
          ? Math.round((acceptedSubmissions / totalSubmissions) * 100)
          : 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/users/update — update profile
 */
router.put('/update', authenticate, async (req, res, next) => {
  try {
    const { displayName, username } = req.body;
    const update = {};

    if (displayName !== undefined) update.displayName = displayName;
    if (username !== undefined) {
      const taken = await User.findOne({ username, _id: { $ne: req.user._id } });
      if (taken) return res.status(400).json({ message: 'Username already taken' });
      update.username = username;
    }

    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true })
      .select('-passwordHash');
    res.json(user);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/users/upload-avatar — upload profile picture
 */
router.post('/upload-avatar', authenticate, upload.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image file uploaded' });

    // Delete old avatar file if it exists
    const oldUser = await User.findById(req.user._id);
    if (oldUser?.avatar) {
      const oldFilename = oldUser.avatar.split('/').pop();
      const oldPath = path.join(uploadsDir, oldFilename);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: avatarUrl },
      { new: true }
    ).select('-passwordHash');

    res.json({ avatar: avatarUrl, user });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/users/stats/global — global platform stats (for dashboard cards)
 */
router.get('/stats/global', authenticate, async (req, res, next) => {
  try {
    const [totalUsers, activeRooms, totalSubmissions] = await Promise.all([
      User.countDocuments(),
      Room.countDocuments({ status: 'active' }),
      Submission.countDocuments(),
    ]);

    res.json({
      totalUsers,
      activeRooms,
      totalSubmissions,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
