import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  createContest,
  getContest,
  getLeaderboard,
  submitContestSolution,
  getPublicContests,
  joinContest,
  getMyContestHistory,
  getContestAiAnalysis,
} from '../controllers/contestController.js';

const router = express.Router();

router.get('/public',         authenticate, getPublicContests);
router.get('/history/me',     authenticate, getMyContestHistory);
router.post('/join/:code',    authenticate, joinContest);
router.post('/',              authenticate, createContest);
router.post('/:id/analysis/:problemIndex', authenticate, getContestAiAnalysis);
router.get('/:id',            authenticate, getContest);
router.get('/:id/leaderboard', authenticate, getLeaderboard);
router.post('/:id/submit',    authenticate, submitContestSolution);

export default router;
