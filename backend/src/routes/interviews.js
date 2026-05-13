import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  createInterview,
  getInterviewByRoom,
  getSubmissions,
  updateInterview,
  completeInterview,
  scheduleInterview,
  matchScheduledInterviews,
  getUpcomingInterviews,
  cancelScheduledInterview,
  switchInterviewRoles,
  submitInterviewFeedback,
  getMyInterviewHistory,
  getInterviewAiFeedback,
} from '../controllers/interviewController.js';

const router = express.Router();

router.post('/',                authenticate, createInterview);
router.post('/start',           authenticate, createInterview);  // alias
router.post('/schedule',        authenticate, scheduleInterview);
router.post('/match',           authenticate, matchScheduledInterviews);
router.get('/upcoming',         authenticate, getUpcomingInterviews);
router.get('/history/me',       authenticate, getMyInterviewHistory);
router.get('/room/:roomId',     authenticate, getInterviewByRoom);
router.get('/:id/submissions',  authenticate, getSubmissions);
router.post('/:id/switch-role', authenticate, switchInterviewRoles);
router.post('/:id/feedback',    authenticate, submitInterviewFeedback);
router.post('/:id/ai-feedback', authenticate, getInterviewAiFeedback);
router.post('/:id/cancel',      authenticate, cancelScheduledInterview);
router.patch('/:id',            authenticate, updateInterview);
router.post('/:id/complete',    authenticate, completeInterview);

export default router;
