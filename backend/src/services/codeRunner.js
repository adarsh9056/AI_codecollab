/**
 * codeRunner.js — compatibility shim.
 * All execution now routes through judgeService.js ➜ Judge0 CE (free).
 */
import { executeCode } from './judgeService.js';

export async function runCode(code, language, stdin = '', timeLimitMs = 5000) {
  return executeCode(code, language, stdin, Math.ceil(timeLimitMs / 1000));
}

export async function runSingleTest(code, language, testInput, timeLimitMs = 5000) {
  const run = await runCode(code, language, testInput, timeLimitMs);
  return { ...run, passed: false };
}
