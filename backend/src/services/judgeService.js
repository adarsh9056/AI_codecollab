/**
 * judgeService.js — Free Judge0 CE integration + LeetCode-style code wrapping.
 *
 * Endpoint: https://ce.judge0.com (FREE, no API key, no RapidAPI)
 *
 * EXECUTION FLOW:
 *   1. User writes ONLY the function body
 *   2. Backend wraps it inside the driver code (starterCode template)
 *   3. Wrapped source is POSTed to Judge0 CE with stdin
 *   4. Judge0 returns stdout, stderr, status, time
 *   5. Backend compares stdout vs expectedOutput per test case
 */

import axios from 'axios';
import { JUDGE0_URL, LANG_IDS, LIMITS } from '../config/index.js';

/* ─────────────────────────────────────────────────
   1. EXECUTE CODE — POST to Judge0 CE
   ───────────────────────────────────────────────── */

/**
 * Submit source code to the free Judge0 CE and wait for the result.
 *
 * @param {string} sourceCode  — full wrapped source
 * @param {string} language    — javascript | python | cpp | java
 * @param {string} stdin       — test-case input
 * @param {number} timeLimitSec — CPU time limit in seconds
 * @returns {{ stdout, stderr, error, timedOut, executionTime }}
 */
export async function executeCode(sourceCode, language, stdin = '', timeLimitSec = 5) {
  const languageId = LANG_IDS[language];
  if (!languageId) {
    return { stdout: '', stderr: '', error: `Unsupported language: ${language}`, timedOut: false, executionTime: 0 };
  }

  const toBase64 = (str) => {
    if (!str) return '';
    return Buffer.from(str, 'utf-8').toString('base64');
  };

  const fromBase64 = (str) => {
    if (!str) return '';
    return Buffer.from(str, 'base64').toString('utf-8');
  };

  try {
    const res = await axios.post(
      `${JUDGE0_URL}/submissions?base64_encoded=true&wait=true&fields=stdout,stderr,compile_output,message,status,time`,
      {
        source_code: toBase64(sourceCode),
        language_id: languageId,
        stdin: toBase64(stdin),
        cpu_time_limit: Math.min(timeLimitSec, LIMITS.maxTimeoutMs / 1000),
        wall_time_limit: Math.min(timeLimitSec + 5, (LIMITS.maxTimeoutMs / 1000) + 5),
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30_000,
      }
    );

    const decodedStdout = fromBase64(res.data.stdout);
    const decodedStderr = fromBase64(res.data.stderr);
    const decodedCompile = fromBase64(res.data.compile_output);
    const decodedMessage = fromBase64(res.data.message);

    const { status, time } = res.data;
    const executionTime = time ? Math.round(parseFloat(time) * 1000) : 0;

    let error = null;
    if (status && status.id !== 3) {
      if (status.id === 5) {
        error = 'Time Limit Exceeded';
      } else if (status.id === 6) {
        error = decodedCompile || 'Compilation Error';
      } else {
        error = decodedCompile || decodedMessage || decodedStderr || status.description || 'Runtime Error';
      }
    }

    return {
      stdout: (decodedStdout || '').trimEnd(),
      stderr: decodedStderr || '',
      error,
      timedOut: status?.id === 5,
      executionTime,
    };
  } catch (err) {
    const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Judge0 request failed';
    return { stdout: '', stderr: '', error: msg, timedOut: false, executionTime: 0 };
  }
}


/* ─────────────────────────────────────────────────
   2. LEETCODE-STYLE CODE WRAPPING
   ─────────────────────────────────────────────────

   Every Problem stores a `starterCode` per language that contains:
     • The function signature (editable by user)
     • A `// USER_CODE_HERE` placeholder inside the function body
     • Protected driver code that reads stdin, calls the function,
       and prints the result

   The user writes ONLY inside the function. The backend replaces
   the placeholder with the user's code before sending to Judge0.
*/

/**
 * Wrap user code into the problem's driver template.
 */
export function wrapUserCode(userCode, language, functionName, driverCode) {
  const lang = (language || 'javascript').toLowerCase();
  
  // Use problem-specific driver if available
  if (driverCode && driverCode[lang]) {
    const template = driverCode[lang];
    const tag = lang === 'python' ? '# USER_CODE_HERE' : '// USER_CODE_HERE';
    if (template.includes(tag)) {
      return template.replace(tag, userCode);
    }
  }

  // Fallback to generic drivers
  switch (lang) {
    case 'javascript': return wrapJS(userCode, functionName);
    case 'python':     return wrapPython(userCode, functionName);
    case 'cpp':        return wrapCpp(userCode, functionName);
    case 'java':       return wrapJava(userCode, functionName);
    default:           return userCode;
  }
}

function wrapJS(userCode, functionName) {
  return `
const fs = require('fs');
const input = fs.readFileSync(0, 'utf8');
const lines = input.split(/\\r?\\n/).filter(line => line.trim() !== '');

${userCode}

const parseArg = (val) => {
  try { return JSON.parse(val); } catch (e) { return val; }
};

const args = lines.map(parseArg);
try {
  let func;
  if (typeof Solution !== 'undefined') {
    const sol = new Solution();
    func = sol.${functionName}.bind(sol);
  } else {
    func = ${functionName};
  }
  
  const result = func(...args);
  if (result === undefined) {}
  else if (typeof result === 'object') console.log(JSON.stringify(result));
  else console.log(result);
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
`.trim();
}

function wrapPython(userCode, functionName) {
  return `
import sys, json

${userCode}

if __name__ == "__main__":
    lines = [l.strip() for l in sys.stdin.readlines() if l.strip()]
    args = []
    for l in lines:
        try: args.append(json.loads(l))
        except: args.append(l)
    
    try:
        if 'Solution' in globals():
            sol = Solution()
            func = getattr(sol, "${functionName}")
            result = func(*args)
        else:
            result = ${functionName}(*args)
            
        if isinstance(result, (list, dict)):
            print(json.dumps(result))
        elif result is not None:
            print(result)
    except Exception as e:
        print(str(e), file=sys.stderr)
        sys.exit(1)
`.trim();
}

function wrapCpp(userCode, functionName) {
  return `
#include <bits/stdc++.h>
using namespace std;

${userCode}

int main() {
    Solution sol;
    // Generic logic would read from stdin here. 
    // Since we now use Problem.driverCode, this is only a fallback.
    return 0;
}
`.trim();
}

function wrapJava(userCode, functionName) {
  return `
import java.util.*;
import java.io.*;

${userCode}

public class Main {
    public static void main(String[] args) {
        Solution sol = new Solution();
    }
}
`.trim();
}


/* ─────────────────────────────────────────────────
   3. CODE SANITIZATION
   ───────────────────────────────────────────────── */

const DANGEROUS_PATTERNS = [
  /require\s*\(\s*['"`]child_process/i,
  /require\s*\(\s*['"`]fs/i,
  /require\s*\(\s*['"`]net/i,
  /require\s*\(\s*['"`]http/i,
  /require\s*\(\s*['"`]https/i,
  /require\s*\(\s*['"`]dgram/i,
  /require\s*\(\s*['"`]cluster/i,
  /require\s*\(\s*['"`]worker_threads/i,
  /import\s*\(\s*['"`]/i,
  /import\s+os\b/i,
  /import\s+subprocess\b/i,
  /from\s+os\s+import/i,
  /from\s+subprocess\s+import/i,
  /import\s+shutil\b/i,
  /import\s+socket\b/i,
  /\bexec\s*\(/i,
  /\bspawn\s*\(/i,
  /\bsystem\s*\(/i,
  /\bpopen\s*\(/i,
  /require\s*\(\s*`/i,
  /process\.env/i,
  /process\.exit/i,
  /\bfork\s*\(/,
  /\bexecve?\s*\(/,
];

export function sanitizeCode(code) {
  if (!code || typeof code !== 'string') {
    throw new Error('Code is required');
  }
  if (code.length > LIMITS.maxCodeLength) {
    throw new Error(`Code exceeds maximum length of ${LIMITS.maxCodeLength} characters`);
  }
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(code)) {
      throw new Error('Code contains prohibited patterns');
    }
  }
  return code;
}


/* ─────────────────────────────────────────────────
   4. OUTPUT NORMALIZATION & TEST RUNNER
   ───────────────────────────────────────────────── */

export function normalizeOutput(s) {
  return (s || '').trim().replace(/\r\n/g, '\n').replace(/\s+$/gm, '').trim();
}

export async function runSingleTest(wrappedCode, language, testInput, timeLimitMs = 5000) {
  return executeCode(wrappedCode, language, testInput, Math.ceil(timeLimitMs / 1000));
}

/**
 * Run code against an array of test cases.
 * Returns { status, passed, total, tests[], error }.
 */
export async function runAgainstTests(wrappedCode, language, testCases, timeLimitMs = 5000) {
  const CONCURRENCY = 3;
  const results = new Array(testCases.length);
  
  for (let i = 0; i < testCases.length; i += CONCURRENCY) {
    const batch = testCases.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(tc => runSingleTest(wrappedCode, language, tc.input, timeLimitMs))
    );
    
    batchResults.forEach((run, j) => {
      const tc = testCases[i + j];
      const actual = normalizeOutput(run.stdout);
      const expected = normalizeOutput(tc.expectedOutput);
      const passed = !run.error && !run.timedOut && actual === expected;
      
      results[i + j] = {
        passed,
        actualOutput: run.error || run.stdout,
        expectedOutput: tc.hidden ? '(hidden)' : tc.expectedOutput,
        executionTime: run.executionTime || 0,
        isHidden: !!tc.hidden,
      };
    });
  }

  let overallStatus = 'ac';
  let firstError = null;
  
  for (const r of results) {
    if (!r.passed && overallStatus === 'ac') {
      const output = r.actualOutput || '';
      if (output.toLowerCase().includes('time limit')) overallStatus = 'tle';
      else if (output.toLowerCase().includes('compil')) overallStatus = 'ce';
      else if (r.actualOutput && r.actualOutput !== r.expectedOutput) overallStatus = 'wa';
      else overallStatus = 're';
    }
    if (!r.passed && !firstError) firstError = r.actualOutput;
  }

  return {
    status: overallStatus,
    passed: results.filter(r => r.passed).length,
    total: results.length,
    tests: results,
    error: firstError,
  };
}
