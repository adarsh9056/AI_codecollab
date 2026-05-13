import express from 'express';
import mongoose from 'mongoose';
import { Problem } from '../models/Problem.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/problems — list problems.
 * Query: ?difficulty=easy&tags=array,dp&limit=50
 * Never exposes hidden test cases.
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { difficulty, category, tags, limit = 50 } = req.query;
    const filter = {};
    if (difficulty) filter.difficulty = difficulty.toLowerCase();
    if (category) filter.category = category.toLowerCase();
    if (tags) filter.tags = { $in: (typeof tags === 'string' ? tags.split(',') : tags) };

    const problems = await Problem.find(filter)
      .select('-testCases')
      .limit(Math.min(Number(limit), 100))
      .sort({ difficulty: 1, title: 1 })
      .lean();

    // Add visible test count
    res.json(problems.map(p => ({
      ...p,
      visibleTestCount: undefined, // already excluded
    })));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/problems/random?count=3&difficulty=easy
 */
router.get('/random', authenticate, async (req, res, next) => {
  try {
    const count = Math.min(Number(req.query.count) || 3, 10);
    const difficulty = req.query.difficulty;
    const filter = difficulty ? { difficulty: difficulty.toLowerCase() } : {};

    const problems = await Problem.aggregate([
      { $match: filter },
      { $sample: { size: count } },
      { $addFields: {
        testCases: { $filter: { input: '$testCases', as: 'tc', cond: { $ne: ['$$tc.hidden', true] } } },
      }},
    ]);

    res.json(problems);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/problems/:slugOrId — single problem by slug or ObjectId.
 * Never exposes hidden test cases.
 */
router.get('/:slugOrId', authenticate, async (req, res, next) => {
  try {
    const { slugOrId } = req.params;
    let problem;

    if (mongoose.Types.ObjectId.isValid(slugOrId)) {
      problem = await Problem.findById(slugOrId).lean();
    } else {
      problem = await Problem.findOne({ slug: slugOrId }).lean();
    }

    if (!problem) return res.status(404).json({ message: 'Problem not found' });

    // Filter out hidden test cases
    problem.testCases = (problem.testCases || []).filter(tc => !tc.hidden);

    res.json(problem);
  } catch (err) {
    next(err);
  }
});

export default router;
