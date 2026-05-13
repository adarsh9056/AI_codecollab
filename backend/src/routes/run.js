import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/auth.js';
import { runHandler } from '../controllers/executionController.js';

const router = express.Router();

const runLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  message: { message: 'Too many execution requests, please try again later' },
});

// POST /api/run — visible test cases only
router.post('/', authenticate, runLimiter, runHandler);

export default router;
