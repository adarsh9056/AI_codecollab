import express from 'express';
import rateLimit from 'express-rate-limit';
import { executeCode } from '../controllers/executeController.js';

const router = express.Router();

const executionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: { success: false, message: 'Too many execution requests, please try again later.' }
});

router.post('/', executionLimiter, executeCode);

export default router;
