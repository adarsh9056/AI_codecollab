import express from 'express';
import { User } from '../models/User.js';
import { Problem } from '../models/Problem.js';
import { Submission } from '../models/Submission.js';
import { Room } from '../models/Room.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/** GET /api/stats — global platform statistics */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const [totalUsers, totalProblems, totalSubmissions, activeRooms, categories] = await Promise.all([
      User.countDocuments(),
      Problem.countDocuments(),
      Submission.countDocuments(),
      Room.countDocuments({ status: 'active' }),
      Problem.distinct('category'),
    ]);

    res.json({ totalUsers, totalProblems, totalSubmissions, activeRooms, categories });
  } catch (err) {
    next(err);
  }
});

export default router;
