/**
 * executionController.js — handles RUN and SUBMIT logic.
 *
 * RUN:    execute against VISIBLE test cases only, no DB save.
 * SUBMIT: execute against ALL test cases (visible + hidden), save to DB.
 */
import { Problem } from '../models/Problem.js';
import { Submission } from '../models/Submission.js';
import {
  wrapUserCode,
  sanitizeCode,
  executeCode,
  runAgainstTests,
} from '../services/judgeService.js';
import { analyzeCodeSync } from '../services/aiFeedback.js';

/**
 * RUN — visible tests only, quick feedback.
 */
export async function runHandler(req, res, next) {
  try {
    const { code, language, problemId, stdin } = req.body;

    if (!code || !language) {
      return res.status(400).json({ message: 'code and language are required' });
    }

    sanitizeCode(code);

    // ── STDIN MODE (interview test cases) ─────────────────────────────────
if (!problemId && stdin !== undefined) {
  const run = await executeCode(code, language, stdin, 5);
  return res.json({
    status: run.error ? 're' : 'ac',
    passed: !run.error && !run.timedOut,
    stdout: run.stdout || '',
    stderr: run.stderr || '',
    output: run.stdout || '',
    error: run.error || null,
    timedOut: run.timedOut || false,
    time: run.executionTime ? `${run.executionTime}ms` : null,
  });
}

    let testCases = [];
    let timeLimit = 5000;
    let wrappedCode = code;

    if (problemId) {
      const problem = await Problem.findById(problemId).lean();
      if (!problem) return res.status(404).json({ message: 'Problem not found' });

      testCases = (problem.testCases || []).filter(tc => !tc.hidden);
      timeLimit = problem.timeLimit || 5000;

      wrappedCode = wrapUserCode(code, language, problem.functionName, problem.driverCode);
    }

    // No test cases — freeform execution
    if (testCases.length === 0) {
      const run = await executeCode(wrappedCode, language, '', Math.ceil(timeLimit / 1000));
      return res.json({
        status: run.error ? 're' : 'ac',
        passed: run.error ? 0 : 1,
        total: 1,
        output: run.stdout,
        error: run.error || null,
        timedOut: run.timedOut,
        tests: [{
          passed: !run.error && !run.timedOut,
          actualOutput: run.stdout || run.error || '',
          expectedOutput: '(no test)',
          executionTime: run.executionTime || 0,
          isHidden: false,
        }],
      });
    }

    const result = await runAgainstTests(wrappedCode, language, testCases, timeLimit);

    return res.json({
      status: result.status,
      passed: result.passed,
      total: result.total,
      output: result.tests[0]?.actualOutput || '',
      error: result.error || null,
      timedOut: result.status === 'tle',
      tests: result.tests,
    });
  } catch (err) {
    if (err.message?.includes('prohibited') || err.message?.includes('maximum length')) {
      return res.status(400).json({ message: err.message });
    }
    next(err);
  }
}

/**
 * SUBMIT — all tests (visible + hidden), saved to DB.
 */
export async function submitHandler(req, res, next) {
  try {
    const { code, language, problemId, roomId, contestId, interviewId } = req.body;

    if (!code || !language || !problemId) {
      return res.status(400).json({ message: 'code, language, and problemId are required' });
    }

    sanitizeCode(code);

    const problem = await Problem.findById(problemId);
    if (!problem) return res.status(404).json({ message: 'Problem not found' });

    const allTests = problem.testCases || [];
    const timeLimit = problem.timeLimit || 5000;

    const wrappedCode = wrapUserCode(code, language, problem.functionName, problem.driverCode);

    const result = await runAgainstTests(wrappedCode, language, allTests, timeLimit);

    // Run AI feedback analysis
    let aiFeedback = null;
    try {
      const analysis = analyzeCodeSync(code);
      aiFeedback = {
        timeComplexity: analysis.timeComplexity,
        spaceComplexity: analysis.spaceComplexity,
        patterns: analysis.patterns || [],
        qualityScore: analysis.qualityScore,
        feedbackText: analysis.feedbackText,
      };
    } catch (_) { /* non-critical */ }

    // Persist
    const submission = await Submission.create({
      userId: req.user._id,
      problemId: problem._id,
      roomId: roomId || undefined,
      contestId: contestId || undefined,
      interviewId: interviewId || undefined,
      code,
      language,
      type: 'submit',
      result: {
        status: result.status,
        passed: result.passed,
        total: result.total,
        output: '',
        error: result.error || '',
        tests: result.tests,
      },
      aiFeedback: aiFeedback || undefined,
    });

    // Sanitize hidden test info before sending to frontend
    const safeTests = result.tests.map(t => ({
      passed: t.passed,
      actualOutput: t.isHidden ? (t.passed ? '(hidden — passed)' : '(hidden — failed)') : t.actualOutput,
      expectedOutput: t.isHidden ? '(hidden)' : t.expectedOutput,
      executionTime: t.executionTime,
      isHidden: t.isHidden,
    }));

    return res.json({
      submissionId: submission._id,
      result: {
        status: result.status,
        passed: result.passed,
        total: result.total,
        error: result.error || null,
        tests: safeTests,
      },
      aiFeedback: aiFeedback || null,
    });
  } catch (err) {
    if (err.message?.includes('prohibited') || err.message?.includes('maximum length')) {
      return res.status(400).json({ message: err.message });
    }
    next(err);
  }
}
