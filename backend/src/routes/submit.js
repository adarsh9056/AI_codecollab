import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/auth.js';
import { submitHandler } from '../controllers/executionController.js';

const router = express.Router();

const submitLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { message: 'Too many submission requests, please try again later' },
});

// POST /api/submit — all test cases, saved to DB
router.post('/', authenticate, submitLimiter, submitHandler);

export default router;
