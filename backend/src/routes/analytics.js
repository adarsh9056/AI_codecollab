import express from 'express';
import { AnalyticsEvent } from '../models/AnalyticsEvent.js';
import { Submission } from '../models/Submission.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// POST /api/analytics/event
router.post('/event', authenticate, async (req, res) => {
  try {
    const { eventType, payload, sessionId, roomId, contestId } = req.body;
    if (!eventType) return res.status(400).json({ message: 'eventType required' });
    await AnalyticsEvent.create({
      userId: req.user._id,
      eventType,
      payload: payload || {},
      sessionId: sessionId || '',
      roomId: roomId || undefined,
      contestId: contestId || undefined,
    });
    res.status(201).json({ message: 'Event recorded' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed' });
  }
});

// GET /api/analytics/me - user stats, trends, suggestions
router.get('/me', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const events = await AnalyticsEvent.find({ userId }).sort({ createdAt: -1 }).limit(500).lean();
    const submissions = await Submission.find({ userId, type: 'submit' })
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('problemId', 'title difficulty')
      .lean();

    const sessionsCompleted = events.filter(e => e.eventType === 'session_end' || e.eventType === 'interview_complete').length;
    const problemsSolved = new Set(submissions.filter(s => s.result?.status === 'ac').map(s => s.problemId?._id?.toString())).size;
    const totalSubmissions = submissions.length;
    const successRate = totalSubmissions ? Math.round((submissions.filter(s => s.result?.status === 'ac').length / totalSubmissions) * 100) : 0;

    const byDifficulty = { easy: 0, medium: 0, hard: 0 };
    submissions.filter(s => s.result?.status === 'ac').forEach(s => {
      if (s.problemId?.difficulty) byDifficulty[s.problemId.difficulty]++;
    });

    const last7 = submissions.filter(s => s.createdAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    const trend = last7.length;

    let suggestions = [];
    if (successRate < 50) suggestions.push('Try more problems and focus on understanding test cases.');
    if (byDifficulty.hard === 0 && (byDifficulty.easy + byDifficulty.medium) > 5) suggestions.push('Consider attempting more hard problems.');
    if (trend === 0) suggestions.push('Practice regularly to see improvement in analytics.');

    res.json({
      sessionsCompleted,
      problemsSolved,
      totalSubmissions,
      successRate,
      byDifficulty,
      trendLast7Days: trend,
      suggestions: suggestions.length ? suggestions : ['Keep up the good work!'],
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Fetch failed' });
  }
});

export default router;
