/**
 * contestController.js — all contest business logic.
 */
import { Contest } from '../models/Contest.js';
import { Room } from '../models/Room.js';
import { Problem } from '../models/Problem.js';
import { Submission } from '../models/Submission.js';
import { LeaderboardEntry } from '../models/LeaderboardEntry.js';
import { wrapUserCode, sanitizeCode, runAgainstTests } from '../services/judgeService.js';
import { analyzeCodeSync } from '../services/aiFeedback.js';
import { LIMITS } from '../config/index.js';

/** POST /api/contests/join/:code — join contest */
export async function joinContest(req, res, next) {
  try {
    const { code } = req.params;
    const contest = await Contest.findOne({ code });
    if (!contest) return res.status(404).json({ message: 'Contest not found' });

    // Add to participants if not already there
    const exists = contest.participants.find(p => p.userId.toString() === req.user._id.toString());
    if (!exists) {
      contest.participants.push({
        userId: req.user._id,
        scores: contest.problemIds.map((_, i) => ({ problemIndex: i, score: 0, attempts: 0 })),
        totalScore: 0,
      });
      await contest.save();
    }

    // Ensure LeaderboardEntry exists
    let entry = await LeaderboardEntry.findOne({ contestId: contest._id, userId: req.user._id });
    if (!entry) {
      await LeaderboardEntry.create({
        contestId: contest._id,
        userId: req.user._id,
        scores: contest.problemIds.map((pid, i) => ({ problemId: pid, problemIndex: i, score: 0, attempts: 0 })),
      });
    }

    const populated = await Contest.findById(contest._id)
      .populate('problemIds')
      .populate('participants.userId', 'username displayName avatar');

    // Broadcast update
    const io = req.app.get('io');
    if (io) {
      const roomName = `room:${code}`;
      io.to(roomName).emit('participantsUpdate', populated.participants);
      
      const allEntries = await LeaderboardEntry.find({ contestId: contest._id })
        .populate('userId', 'username displayName avatar');
      
      allEntries.sort((a, b) => {
        if (b.solvedCount !== a.solvedCount) return b.solvedCount - a.solvedCount;
        return a.totalTime - b.totalTime;
      });

      io.to(roomName).emit('leaderboardUpdate', allEntries.map((e, i) => ({
        rank: i + 1,
        userId: e.userId,
        solvedCount: e.solvedCount,
        totalTime: e.totalTime,
        totalScore: (e.scores || []).reduce((sum, s) => sum + (s.score || 0), 0),
        scores: e.scores,
      })));
    }

    res.json(populated);
  } catch (err) {
    next(err);
  }
}

/** POST /api/contests — create contest */
export async function createContest(req, res, next) {
  try {
    const { title = "Weekly Contest", isPublic = true, duration = 60 } = req.body;
    
    // Auto-select 1 Easy, 1 Medium, 1 Hard
    const [easy] = await Problem.aggregate([{ $match: { difficulty: 'easy' } }, { $sample: { size: 1 } }]);
    const [medium] = await Problem.aggregate([{ $match: { difficulty: 'medium' } }, { $sample: { size: 1 } }]);
    const [hard] = await Problem.aggregate([{ $match: { difficulty: 'hard' } }, { $sample: { size: 1 } }]);

    if (!easy || !medium || !hard) {
      return res.status(500).json({ message: 'Not enough problems in database to start contest' });
    }

    const problemIds = [easy._id, medium._id, hard._id];

    // Create Room automatically with unique code
    let roomCode;
    let attempts = 0;
    do {
      roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      attempts++;
      if (attempts > 10) {
        return res.status(500).json({ message: 'Failed to generate unique contest code' });
      }
    } while (await Room.findOne({ roomCode }));

    const room = await Room.create({
      roomCode,
      mode: 'contest',
      hostId: req.user._id,
      participants: [{ userId: req.user._id, role: 'participant' }]
    });

    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + (duration * 60 * 1000));
    
    // Unique 6-char contest code
    let contestCode;
    attempts = 0;
    do {
      contestCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      attempts++;
      if (attempts > 10) {
        return res.status(500).json({ message: 'Failed to generate unique contest code' });
      }
    } while (await Contest.findOne({ code: contestCode }));

    const contest = await Contest.create({
      title,
      code: contestCode,
      isPublic,
      roomId: room._id,
      problemIds,
      createdBy: req.user._id,
      startTime,
      endTime,
      participants: [{
        userId: req.user._id,
        scores: problemIds.map((_, i) => ({ problemIndex: i, score: 0, attempts: 0 })),
        totalScore: 0,
      }],
      status: 'active',
    });

    await LeaderboardEntry.create({
      contestId: contest._id,
      userId: req.user._id,
      scores: problemIds.map((pid, i) => ({ problemId: pid, problemIndex: i, score: 0, attempts: 0 })),
    });

    await Room.findByIdAndUpdate(room._id, { contestId: contest._id, status: 'active' });

    const populated = await Contest.findById(contest._id)
      .populate('problemIds')
      .populate('participants.userId', 'username displayName avatar');

    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
}

/** GET /api/contests/public */
export async function getPublicContests(req, res, next) {
  try {
    const contests = await Contest.find({
      isPublic: true,
      status: 'active',
      endTime: { $gt: new Date() }
    })
    .populate('problemIds', 'title difficulty')
    .populate('createdBy', 'username avatar')
    .sort({ startTime: -1 });

    res.json(contests);
  } catch (err) {
    next(err);
  }
}

/** GET /api/contests/:code */
export async function getContest(req, res, next) {
  try {
    const contest = await Contest.findOne({ code: req.params.id })
      .populate('problemIds')
      .populate('roomId', 'roomCode')
      .populate('participants.userId', 'username displayName avatar');

    if (!contest) return res.status(404).json({ message: 'Contest not found' });

    // Strip hidden test cases
    const problems = contest.problemIds.map(p => ({
      _id: p._id,
      title: p.title,
      slug: p.slug,
      description: p.description,
      difficulty: p.difficulty,
      constraints: p.constraints,
      tags: p.tags,
      functionName: p.functionName,
      starterCode: p.starterCode,
      examples: p.examples,
      testCases: (p.testCases || []).filter(tc => !tc.hidden),
    }));

    res.json({ ...contest.toObject(), problemIds: problems });
  } catch (err) {
    next(err);
  }
}

/** GET /api/contests/:id/leaderboard */
export async function getLeaderboard(req, res, next) {
  try {
    const entries = await LeaderboardEntry.find({ contestId: req.params.id })
      .populate('userId', 'username displayName avatar')
      .sort({ solvedCount: -1, totalTime: 1 })
      .lean();

    const leaderboard = entries.map((e, i) => ({
      rank: i + 1,
      userId: e.userId,
      solvedCount: e.solvedCount,
      totalTime: e.totalTime,
      totalScore: (e.scores || []).reduce((sum, s) => sum + (s.score || 0), 0),
      scores: e.scores,
    }));

    res.json({ leaderboard });
  } catch (err) {
    next(err);
  }
}

/** POST /api/contests/:id/submit */
export async function submitContestSolution(req, res, next) {
  try {
    const { code, language, problemIndex } = req.body;
    if (code === undefined || !language || problemIndex === undefined) {
      return res.status(400).json({ message: 'code, language, and problemIndex are required' });
    }

    sanitizeCode(code);

    const contest = await Contest.findById(req.params.id);
    if (!contest) return res.status(404).json({ message: 'Contest not found' });
    if (new Date() > contest.endTime) {
      return res.status(400).json({ message: 'Contest has ended' });
    }

    const problemId = contest.problemIds[problemIndex];
    if (!problemId) return res.status(400).json({ message: 'Invalid problem index' });

    const problem = await Problem.findById(problemId);
    if (!problem) return res.status(404).json({ message: 'Problem not found' });

    const wrappedCode = wrapUserCode(code, language, problem.functionName, problem.driverCode);
    const allTests = problem.testCases || [];
    const result = await runAgainstTests(wrappedCode, language, allTests, problem.timeLimit || 5000);
    const allPassed = result.status === 'ac';

    // Store submission
    await Submission.create({
      userId: req.user._id,
      problemId: problem._id,
      contestId: contest._id,
      code,
      language,
      type: 'submit',
      result: { status: result.status, passed: result.passed, total: result.total, error: result.error || '', tests: result.tests },
    });

    // Update LeaderboardEntry
    let entry = await LeaderboardEntry.findOne({ contestId: contest._id, userId: req.user._id });
    if (!entry) {
      entry = await LeaderboardEntry.create({
        contestId: contest._id,
        userId: req.user._id,
        scores: contest.problemIds.map((pid, i) => ({ problemId: pid, problemIndex: i, score: 0, attempts: 0 })),
      });
    }

    const scoreEntry = entry.scores.find(s => s.problemIndex === problemIndex);
    const PENALTY_PER_WRONG = 10;
    if (scoreEntry) {
      scoreEntry.attempts += 1;
      if (allPassed && !scoreEntry.solvedAt) {
        const elapsedSec = Math.floor((Date.now() - contest.startTime.getTime()) / 1000);
        const timeBonus = Math.max(0, Math.floor((contest.endTime - Date.now()) / 1000));
        const baseScore = 100 + Math.min(50, Math.floor(timeBonus / 60));
        const wrongAttempts = scoreEntry.attempts - 1;
        scoreEntry.score = Math.max(0, baseScore - wrongAttempts * PENALTY_PER_WRONG);
        scoreEntry.solvedAt = new Date();
        entry.solvedCount += 1;
        entry.totalTime += elapsedSec;
        entry.penalties += wrongAttempts;
      }
    }
    await entry.save();

    // Updates participants
    let participant = contest.participants.find(p => p.userId.toString() === req.user._id.toString());
    if (!participant) {
      contest.participants.push({
        userId: req.user._id,
        scores: contest.problemIds.map((_, i) => ({ problemIndex: i, score: 0, attempts: 0 })),
        totalScore: 0,
        lastUpdated: new Date(),
      });
      participant = contest.participants[contest.participants.length - 1];
    }
    const pScore = participant.scores[problemIndex];
    if (pScore) {
      pScore.attempts += 1;
      if (allPassed && !pScore.solvedAt) {
        pScore.score = scoreEntry?.score || 100;
        pScore.solvedAt = new Date();
      }
    }
    participant.totalScore = participant.scores.reduce((s, e) => s + (e.score || 0), 0);
    participant.lastUpdated = new Date();
    await contest.save();

    // Real-time Socket.io leaderboard
    const io = req.app.get('io');
    if (io) {
      const roomName = `room:${contest.code}`;
      const allEntries = await LeaderboardEntry.find({ contestId: contest._id })
        .populate('userId', 'username displayName avatar');
      
      // Sort by score (desc), then totalTime (asc)
      allEntries.sort((a, b) => {
        if (b.solvedCount !== a.solvedCount) return b.solvedCount - a.solvedCount;
        return a.totalTime - b.totalTime;
      });

      io.to(roomName).emit('leaderboardUpdate', allEntries.map((e, i) => ({
        rank: i + 1,
        userId: e.userId,
        solvedCount: e.solvedCount,
        totalTime: e.totalTime,
        totalScore: (e.scores || []).reduce((sum, s) => sum + (s.score || 0), 0),
        scores: e.scores,
      })));

      if (allPassed) {
        io.to(roomName).emit('problemSolved', { userId: req.user._id.toString(), problemIndex });
      }
    }

    // Safe response
    const safeTests = result.tests.map(t => ({
      passed: t.passed,
      actualOutput: t.isHidden ? (t.passed ? '✓' : '✗') : t.actualOutput,
      expectedOutput: t.isHidden ? '(hidden)' : t.expectedOutput,
      executionTime: t.executionTime,
      isHidden: t.isHidden,
    }));

    res.json({
      status: result.status,
      passed: result.passed,
      total: result.total,
      score: scoreEntry?.score || 0,
      totalScore: participant.totalScore,
      solved: !!scoreEntry?.solvedAt,
      tests: safeTests,
      error: result.error || null,
    });
  } catch (err) {
    if (err.message?.includes('prohibited')) return res.status(400).json({ message: err.message });
    next(err);
  }
}

/** GET /api/contests/history/me */
export async function getMyContestHistory(req, res, next) {
  try {
    const entries = await LeaderboardEntry.find({ userId: req.user._id })
      .populate('contestId', 'title code startTime endTime status createdAt')
      .sort({ updatedAt: -1 })
      .lean();

    const history = [];
    for (const entry of entries) {
      if (!entry.contestId?._id) continue;
      const contestId = entry.contestId._id;
      const allEntries = await LeaderboardEntry.find({ contestId }).lean();
      allEntries.sort((a, b) => {
        if (b.solvedCount !== a.solvedCount) return b.solvedCount - a.solvedCount;
        return a.totalTime - b.totalTime;
      });
      const rank = allEntries.findIndex(e => e.userId.toString() === req.user._id.toString()) + 1;
      const totalScore = (entry.scores || []).reduce((sum, s) => sum + (s.score || 0), 0);
      history.push({
        contestId,
        contestCode: entry.contestId.code,
        title: entry.contestId.title,
        date: entry.contestId.startTime || entry.contestId.createdAt,
        status: entry.contestId.status,
        questionsSolved: entry.solvedCount || 0,
        pointsScored: totalScore,
        rank: rank > 0 ? rank : null,
        totalParticipants: allEntries.length,
        timeTakenSec: entry.totalTime || 0,
      });
    }

    res.json(history);
  } catch (err) {
    next(err);
  }
}

/** POST /api/contests/:id/analysis/:problemIndex */
export async function getContestAiAnalysis(req, res, next) {
  try {
    const contest = await Contest.findById(req.params.id).lean();
    if (!contest) return res.status(404).json({ message: 'Contest not found' });

    if (new Date() < new Date(contest.endTime)) {
      return res.status(400).json({ message: 'AI analysis is available only after contest ends' });
    }

    const problemIndex = Number(req.params.problemIndex);
    if (!Number.isInteger(problemIndex) || problemIndex < 0 || problemIndex >= contest.problemIds.length) {
      return res.status(400).json({ message: 'Invalid problem index' });
    }

    const problemId = contest.problemIds[problemIndex];
    const submission = await Submission.findOne({
      contestId: contest._id,
      userId: req.user._id,
      problemId,
    }).sort({ createdAt: -1 }).populate('problemId', 'title description');

    if (!submission) {
      return res.status(404).json({ message: 'No submission found for this problem' });
    }

    const analysis = analyzeCodeSync(submission.code || '');
    const structured = {
      codeQuality: analysis.qualityScore,
      timeComplexity: analysis.timeComplexity,
      spaceComplexity: analysis.spaceComplexity,
      betterApproach: analysis.patterns?.join(', ') || 'No specific pattern detected',
      mistakes: analysis.feedbackText,
      edgeCasesMissed: (analysis.feedbackText || '').includes('Suggestions:')
        ? analysis.feedbackText.split('Suggestions:')[1]?.trim() || 'None'
        : 'None detected from rule-based analyzer',
    };

    res.json({
      contestId: contest._id,
      problemIndex,
      problem: submission.problemId,
      submissionId: submission._id,
      analysis: structured,
      raw: analysis,
    });
  } catch (err) {
    next(err);
  }
}
