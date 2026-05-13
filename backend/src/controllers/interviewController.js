/**
 * interviewController.js — interview session logic.
 *
 * Roles:
 *   Interviewer — creates session, views submissions, sends hints, evaluates
 *   Candidate   — submits code, receives hints
 */
import { Interview } from '../models/Interview.js';
import { Room } from '../models/Room.js';
import { Problem } from '../models/Problem.js';
import { Submission } from '../models/Submission.js';
import { analyzeCodeSync } from '../services/aiFeedback.js';

function normalizeLevel(level = 'beginner') {
  const l = String(level).toLowerCase();
  if (['beginner', 'intermediate', 'advanced'].includes(l)) return l;
  return 'beginner';
}

async function pickInterviewProblems(level) {
  const norm = normalizeLevel(level);
  const difficultyByLevel = {
    beginner: ['easy', 'medium'],
    intermediate: ['medium', 'medium'],
    advanced: ['medium', 'hard'],
  };
  const [d1, d2] = difficultyByLevel[norm];
  const [p1] = await Problem.aggregate([{ $match: { difficulty: d1 } }, { $sample: { size: 1 } }, { $project: { _id: 1 } }]);
  const [p2] = await Problem.aggregate([{ $match: { difficulty: d2 } }, { $sample: { size: 1 } }, { $project: { _id: 1 } }]);
  return [p1?._id, p2?._id].filter(Boolean);
}

function buildCalendarPayload(interview) {
  const start = new Date(interview.scheduledFor || Date.now());
  const end = new Date(start.getTime() + (interview.meetingDurationMin || 45) * 60 * 1000);
  return {
    title: `CodeCollab Interview (${interview.level})`,
    start: start.toISOString(),
    end: end.toISOString(),
    description: `Mode: ${interview.mode}. Time slot: ${interview.timeSlot || 'custom'}.`,
  };
}

/** POST /api/interviews (or /api/interviews/start) */
export async function createInterview(req, res, next) {
  try {
    const { roomId, interviewerId, candidateId, mode = 'friend', level = 'beginner', scheduledFor, timeSlot = '' } = req.body;
    if (!roomId || !interviewerId) {
      return res.status(400).json({ message: 'roomId and interviewerId are required' });
    }

    const existing = await Interview.findOne({ roomId });
    if (existing) return res.status(400).json({ message: 'Interview already exists for this room' });

    let problemIds = req.body.problemIds || [];
    if (problemIds.length === 0) {
      problemIds = await pickInterviewProblems(level);
    }

    const interview = await Interview.create({
      roomId,
      interviewerId,
      candidateId,
      mode,
      level: normalizeLevel(level),
      scheduledFor: scheduledFor ? new Date(scheduledFor) : new Date(),
      timeSlot,
      status: candidateId ? 'matched' : 'scheduled',
      problemIds,
      rounds: candidateId && problemIds[0] ? [{
        roundNo: 1,
        interviewerId,
        candidateId,
        problemId: problemIds[0],
      }] : [],
    });

    const populated = await Interview.findById(interview._id)
      .populate('interviewerId', 'username displayName')
      .populate('candidateId', 'username displayName')
      .populate('problemIds');

    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
}

/** GET /api/interviews/room/:roomId */
export async function getInterviewByRoom(req, res, next) {
  try {
    const interview = await Interview.findOne({ roomId: req.params.roomId })
      .populate('interviewerId', 'username displayName avatar')
      .populate('candidateId', 'username displayName avatar')
      .populate('problemIds');

    if (!interview) return res.status(404).json({ message: 'Interview not found' });

    const safe = interview.toObject();
    if (safe.problemIds) {
      safe.problemIds = safe.problemIds.map(p => ({
        ...p,
        testCases: (p.testCases || []).filter(tc => !tc.hidden),
      }));
    }

    res.json(safe);
  } catch (err) {
    next(err);
  }
}

/** GET /api/interviews/:id/submissions — interviewer sees all, candidate sees own */
export async function getSubmissions(req, res, next) {
  try {
    const interview = await Interview.findById(req.params.id);
    if (!interview) return res.status(404).json({ message: 'Interview not found' });

    const isInterviewer = interview.interviewerId.toString() === req.user._id.toString();
    const isCandidate = interview.candidateId?.toString() === req.user._id.toString();
    if (!isInterviewer && !isCandidate) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const filter = { interviewId: interview._id };
    if (isCandidate) filter.userId = req.user._id;

    const submissions = await Submission.find(filter)
      .populate('userId', 'username displayName')
      .populate('problemId', 'title slug difficulty')
      .sort({ createdAt: -1 })
      .lean();

    // Sanitize hidden tests
    const safe = submissions.map(s => ({
      ...s,
      result: s.result ? {
        ...s.result,
        tests: (s.result.tests || []).map(t => ({
          ...t,
          actualOutput: t.isHidden ? (t.passed ? '✓' : '✗') : t.actualOutput,
          expectedOutput: t.isHidden ? '(hidden)' : t.expectedOutput,
        })),
      } : s.result,
    }));

    res.json(safe);
  } catch (err) {
    next(err);
  }
}

/** POST /api/interviews/schedule */
export async function scheduleInterview(req, res, next) {
  try {
    const {
      mode = 'peer',
      level = 'beginner',
      scheduledFor,
      timeSlot = '',
      friendUserId = null,
      durationMin = 45,
    } = req.body;

    if (!scheduledFor) {
      return res.status(400).json({ message: 'scheduledFor is required' });
    }

    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const room = await Room.create({
      roomCode,
      mode: 'interview',
      status: 'waiting',
      hostId: req.user._id,
      participants: [{ userId: req.user._id, role: 'interviewer' }],
    });

    const problems = await pickInterviewProblems(level);
    const candidateId = mode === 'friend' && friendUserId ? friendUserId : undefined;
    if (candidateId) {
      room.participants.push({ userId: candidateId, role: 'candidate' });
      await room.save();
    }

    const interview = await Interview.create({
      roomId: room._id,
      interviewerId: req.user._id,
      candidateId,
      mode: mode === 'friend' ? 'friend' : 'peer',
      level: normalizeLevel(level),
      scheduledFor: new Date(scheduledFor),
      timeSlot,
      meetingDurationMin: durationMin,
      status: candidateId ? 'matched' : 'scheduled',
      problemIds: problems,
      rounds: candidateId && problems[0] ? [{
        roundNo: 1,
        interviewerId: req.user._id,
        candidateId,
        problemId: problems[0],
      }] : [],
    });

    room.status = candidateId ? 'active' : 'waiting';
    room.problemId = problems[0] || undefined;
    await room.save();

    const populated = await Interview.findById(interview._id)
      .populate('interviewerId', 'username displayName avatar')
      .populate('candidateId', 'username displayName avatar')
      .populate('problemIds');

    res.status(201).json({
      ...populated.toObject(),
      roomCode,
      calendar: buildCalendarPayload(populated),
    });
  } catch (err) {
    next(err);
  }
}

/** POST /api/interviews/match */
export async function matchScheduledInterviews(req, res, next) {
  try {
    const { interviewId } = req.body;
    const current = await Interview.findById(interviewId);
    if (!current) return res.status(404).json({ message: 'Interview not found' });
    if (current.interviewerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only scheduler can trigger matching' });
    }
    if (current.mode !== 'peer') return res.status(400).json({ message: 'Matching is available for peer mode only' });
    if (current.status !== 'scheduled') return res.json({ matched: false, reason: 'Already matched' });

    const candidates = await Interview.find({
      _id: { $ne: current._id },
      mode: 'peer',
      level: current.level,
      timeSlot: current.timeSlot,
      status: 'scheduled',
      candidateId: { $exists: false },
    }).sort({ createdAt: 1 }).limit(1);

    const partnerInterview = candidates[0];
    if (!partnerInterview) {
      return res.json({ matched: false, reason: 'No peer found yet for same time and level' });
    }

    current.candidateId = partnerInterview.interviewerId;
    current.status = 'active';
    current.startedAt = new Date();
    current.currentRound = 1;
    if (!current.rounds?.length) {
      current.rounds = [{
        roundNo: 1,
        interviewerId: current.interviewerId,
        candidateId: current.candidateId,
        problemId: current.problemIds?.[0],
      }];
    }
    await current.save();

    partnerInterview.status = 'cancelled';
    partnerInterview.report = `Merged into interview ${current._id.toString()} after peer matching.`;
    await partnerInterview.save();

    const room = await Room.findById(current.roomId);
    if (room) {
      const already = room.participants.some(p => p.userId.toString() === current.candidateId.toString());
      if (!already) room.participants.push({ userId: current.candidateId, role: 'candidate' });
      room.status = 'active';
      room.problemId = current.problemIds?.[0] || room.problemId;
      await room.save();
    }

    const populated = await Interview.findById(current._id)
      .populate('interviewerId', 'username displayName avatar')
      .populate('candidateId', 'username displayName avatar')
      .populate('problemIds')
      .populate('roomId', 'roomCode status');

    res.json({ matched: true, interview: populated });
  } catch (err) {
    next(err);
  }
}

/** GET /api/interviews/upcoming */
export async function getUpcomingInterviews(req, res, next) {
  try {
    const upcoming = await Interview.find({
      $and: [
        { $or: [{ interviewerId: req.user._id }, { candidateId: req.user._id }] },
        { $or: [{ endedAt: { $exists: false } }, { endedAt: null }] },
      ],
      status: { $in: ['scheduled', 'matched', 'active'] },
    })
      .populate('interviewerId', 'username displayName avatar')
      .populate('candidateId', 'username displayName avatar')
      .populate('problemIds', 'title difficulty')
      .populate('roomId', 'roomCode status')
      .sort({ scheduledFor: 1 })
      .lean();

    res.json(upcoming);
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/interviews/:id — interviewer updates notes/hints/evaluation */
export async function updateInterview(req, res, next) {
  try {
    const interview = await Interview.findById(req.params.id);
    if (!interview) return res.status(404).json({ message: 'Interview not found' });
    if (interview.interviewerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the interviewer can update' });
    }

    const { notes, hintsSent, evaluation, hint, problemId } = req.body;
    if (notes !== undefined) interview.notes = notes;
    if (Array.isArray(hintsSent)) interview.hintsSent = hintsSent;
    else if (hint && problemId) interview.hintsSent.push({ problemId, hint });
    if (evaluation !== undefined) interview.evaluation = evaluation;

    await interview.save();

    const updated = await Interview.findById(interview._id)
      .populate('interviewerId', 'username displayName')
      .populate('candidateId', 'username displayName');

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

/** POST /api/interviews/:id/cancel */
export async function cancelScheduledInterview(req, res, next) {
  try {
    const interview = await Interview.findById(req.params.id);
    if (!interview) return res.status(404).json({ message: 'Interview not found' });
    const isParticipant = [interview.interviewerId?.toString(), interview.candidateId?.toString()].includes(req.user._id.toString());
    if (!isParticipant) return res.status(403).json({ message: 'Not authorized' });
    if (interview.status === 'completed') return res.status(400).json({ message: 'Completed interview cannot be cancelled' });
    interview.status = 'cancelled';
    interview.endedAt = new Date();
    await interview.save();
    const room = await Room.findById(interview.roomId);
    if (room) {
      room.status = 'completed';
      await room.save();
    }
    res.json({ message: 'Interview cancelled' });
  } catch (err) {
    next(err);
  }
}

/** POST /api/interviews/:id/switch-role */
export async function switchInterviewRoles(req, res, next) {
  try {
    const interview = await Interview.findById(req.params.id);
    if (!interview) return res.status(404).json({ message: 'Interview not found' });
    const isParticipant = [interview.interviewerId?.toString(), interview.candidateId?.toString()].includes(req.user._id.toString());
    if (!isParticipant) return res.status(403).json({ message: 'Only participants can switch roles' });
    if (!interview.candidateId) return res.status(400).json({ message: 'Candidate not assigned yet' });

    interview.status = 'active';
    const lastRound = interview.rounds?.[interview.rounds.length - 1];
    if (lastRound && !lastRound.endedAt) lastRound.endedAt = new Date();

    const prevInterviewer = interview.interviewerId;
    interview.interviewerId = interview.candidateId;
    interview.candidateId = prevInterviewer;
    interview.currentRound = Math.min(2, (interview.currentRound || 1) + 1);

    const nextProblem = interview.problemIds?.[interview.currentRound - 1] || interview.problemIds?.[0];
    interview.rounds.push({
      roundNo: interview.currentRound,
      interviewerId: interview.interviewerId,
      candidateId: interview.candidateId,
      problemId: nextProblem,
      startedAt: new Date(),
    });
    await interview.save();

    const room = await Room.findById(interview.roomId);
    if (room) {
      room.problemId = nextProblem || room.problemId;
      room.participants = room.participants.map(p => {
        const plain = typeof p.toObject === 'function' ? p.toObject() : p;
        if (p.userId.toString() === interview.interviewerId.toString()) return { ...plain, role: 'interviewer' };
        if (p.userId.toString() === interview.candidateId.toString()) return { ...plain, role: 'candidate' };
        return plain;
      });
      await room.save();

      const io = req.app.get('io');
      if (io) {
        io.to(`room:${room.roomCode}`).emit('problem_change', {
          problemId: nextProblem?.toString?.() || nextProblem,
          changedBy: req.user._id.toString(),
        });
      }
    }

    const populated = await Interview.findById(interview._id)
      .populate('interviewerId', 'username displayName avatar')
      .populate('candidateId', 'username displayName avatar')
      .populate('problemIds')
      .populate('roomId', 'roomCode');

    res.json(populated);
  } catch (err) {
    next(err);
  }
}

/** POST /api/interviews/:id/feedback */
export async function submitInterviewFeedback(req, res, next) {
  try {
    const { rating, feedback = '' } = req.body;
    if (!rating) return res.status(400).json({ message: 'rating is required' });
    const interview = await Interview.findById(req.params.id);
    if (!interview) return res.status(404).json({ message: 'Interview not found' });
    const isParticipant = [interview.interviewerId?.toString(), interview.candidateId?.toString()].includes(req.user._id.toString());
    if (!isParticipant) return res.status(403).json({ message: 'Not authorized' });

    const existing = interview.participantFeedback.find(f => f.userId.toString() === req.user._id.toString());
    if (existing) {
      existing.rating = rating;
      existing.feedback = feedback;
      existing.createdAt = new Date();
    } else {
      interview.participantFeedback.push({ userId: req.user._id, rating, feedback });
    }
    await interview.save();
    res.json({ message: 'Feedback saved' });
  } catch (err) {
    next(err);
  }
}

/** GET /api/interviews/history/me */
export async function getMyInterviewHistory(req, res, next) {
  try {
    const history = await Interview.find({
      $and: [
        { $or: [{ interviewerId: req.user._id }, { candidateId: req.user._id }] },
        { $or: [{ status: 'completed' }, { endedAt: { $ne: null } }] },
      ],
    })
      .populate('interviewerId', 'username displayName avatar')
      .populate('candidateId', 'username displayName avatar')
      .populate('problemIds', 'title difficulty')
      .populate('roomId', 'roomCode')
      .sort({ endedAt: -1 })
      .lean();

    const formatted = history.map(item => {
      const me = req.user._id.toString();
      const partner = item.interviewerId?._id?.toString() === me ? item.candidateId : item.interviewerId;
      const mine = item.participantFeedback?.find(f => f.userId?.toString() === me);
      return {
        interviewId: item._id,
        mode: item.mode,
        level: item.level,
        date: item.scheduledFor || item.startedAt,
        durationMin: item.startedAt && item.endedAt ? Math.round((new Date(item.endedAt) - new Date(item.startedAt)) / 60000) : item.meetingDurationMin,
        partner,
        roomCode: item.roomId?.roomCode,
        questions: item.problemIds || [],
        roundsCompleted: item.rounds?.length || 0,
        myRating: mine?.rating || null,
        myFeedback: mine?.feedback || '',
        report: item.report || '',
      };
    });

    res.json(formatted);
  } catch (err) {
    next(err);
  }
}

/** POST /api/interviews/:id/ai-feedback */
export async function getInterviewAiFeedback(req, res, next) {
  try {
    const interview = await Interview.findById(req.params.id);
    if (!interview) return res.status(404).json({ message: 'Interview not found' });
    if (interview.status !== 'completed' && !interview.endedAt) {
      return res.status(400).json({ message: 'AI feedback is available only after interview ends' });
    }
    const isParticipant = [interview.interviewerId?.toString(), interview.candidateId?.toString()].includes(req.user._id.toString());
    if (!isParticipant) return res.status(403).json({ message: 'Not authorized' });

    const targetProblemId = req.body.problemId || interview.problemIds?.[0];
    const submission = await Submission.findOne({
      interviewId: interview._id,
      userId: req.user._id,
      problemId: targetProblemId,
    }).sort({ createdAt: -1 }).populate('problemId', 'title description');

    if (!submission) {
      return res.status(404).json({ message: 'No submission found for AI feedback' });
    }

    const raw = analyzeCodeSync(submission.code || '');
    const analysis = {
      codeQuality: raw.qualityScore,
      timeComplexity: raw.timeComplexity,
      spaceComplexity: raw.spaceComplexity,
      betterApproach: raw.patterns?.join(', ') || 'No specific pattern detected',
      mistakes: raw.feedbackText,
      edgeCasesMissed: (raw.feedbackText || '').includes('Suggestions:')
        ? raw.feedbackText.split('Suggestions:')[1]?.trim() || 'None'
        : 'None detected from rule-based analyzer',
    };

    res.json({
      interviewId: interview._id,
      submissionId: submission._id,
      problem: submission.problemId,
      analysis,
      raw,
    });
  } catch (err) {
    next(err);
  }
}

/** POST /api/interviews/:id/complete */
export async function completeInterview(req, res, next) {
  try {
    const interview = await Interview.findById(req.params.id)
      .populate('interviewerId', 'username displayName')
      .populate('candidateId', 'username displayName');

    if (!interview) return res.status(404).json({ message: 'Interview not found' });
    const isParticipant = [interview.interviewerId?._id?.toString(), interview.candidateId?._id?.toString()].includes(req.user._id.toString());
    if (!isParticipant) return res.status(403).json({ message: 'Only participants can complete interview' });

    interview.endedAt = new Date();
    interview.status = 'completed';
    const lastRound = interview.rounds?.[interview.rounds.length - 1];
    if (lastRound && !lastRound.endedAt) lastRound.endedAt = interview.endedAt;

    const ev = interview.evaluation || {};
    const scores = [ev.problemSolving, ev.communication, ev.codeQuality, ev.overall].filter(Boolean);
    const avgScore = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 'N/A';

    const submissions = await Submission.find({ interviewId: interview._id }).lean();
    const accepted = submissions.filter(s => s.result?.status === 'ac').length;

    interview.report = [
      'INTERVIEW REPORT',
      '────────────────────────────────',
      `Candidate: ${interview.candidateId?.displayName || interview.candidateId?.username || 'Unknown'}`,
      `Completed: ${interview.endedAt.toISOString()}`,
      `Duration: ${Math.round((interview.endedAt - interview.startedAt) / 60000)} min`,
      '',
      'SCORES',
      `  Problem Solving: ${ev.problemSolving || '—'}/5`,
      `  Communication:   ${ev.communication || '—'}/5`,
      `  Code Quality:    ${ev.codeQuality || '—'}/5`,
      `  Overall:         ${ev.overall || '—'}/5`,
      `  Average:         ${avgScore}`,
      '',
      `SUBMISSIONS: ${submissions.length} total, ${accepted} accepted`,
      `NOTES: ${interview.notes || 'None'}`,
      `COMMENT: ${ev.comment || 'None'}`,
    ].join('\n');

    await interview.save();

    const room = await Room.findById(interview.roomId);
    if (room) {
      room.status = 'completed';
      await room.save();
      const io = req.app.get('io');
      if (io) {
        io.to(`room:${room.roomCode}`).emit('interview_completed', { interviewId: interview._id.toString() });
      }
    }

    res.json(interview);
  } catch (err) {
    next(err);
  }
}
