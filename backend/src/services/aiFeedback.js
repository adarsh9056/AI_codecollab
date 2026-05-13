/**
 * Rule-based code analysis: complexity estimation, pattern detection, quality score.
 * Placeholder structure for future LLM integration.
 */

/**
 * Estimate time complexity from code patterns (heuristics).
 */
export function estimateTimeComplexity(code) {
  const c = (code || '').toLowerCase();
  if (/\bfor\s*\([^)]*\bfor\b/.test(c) || /\.forEach\s*\([^)]*\.forEach/.test(c)) return 'O(n^2)';
  if (/\bfor\s*\(/.test(c) || /\.forEach\b/.test(c) || /\.map\b/.test(c)) return 'O(n)';
  if (/\bbinary\s*search\b|\.sort\s*\(/.test(c)) return 'O(n log n)';
  if (/\bwhile\s*\(/.test(c) && /\.length|\.size/.test(c)) return 'O(n)';
  if (/\brecursion\b|function\s+\w+\s*\([^)]*\)\s*\{[^}]*\w+\s*\(/.test(c)) return 'O(n) or O(2^n)';
  return 'O(n)';
}

/**
 * Estimate space complexity.
 */
export function estimateSpaceComplexity(code) {
  const c = (code || '').toLowerCase();
  if (/\b\[\]|\b\{\}|\bnew\s+Array\b|\bnew\s+Map\b|\bnew\s+Set\b/.test(c)) return 'O(n)';
  if (/\brecursion\b|function\s+\w+\s*\(/.test(c)) return 'O(n) stack';
  return 'O(1)';
}

/**
 * Detect common DSA/algorithm patterns from keywords and structure.
 */
export function detectPatterns(code) {
  const c = (code || '').toLowerCase();
  const patterns = [];
  if (/\btwo\s*pointer|left\s*=\s*0|right\s*=\s*\w+\.length\s*-\s*1|while\s*\(\s*left\s*<\s*right/.test(c)) patterns.push('Two Pointers');
  if (/\bsliding\s*window|window\s*start|window\s*end|while\s*\(\s*end\s*<\s*\w+\.length/.test(c)) patterns.push('Sliding Window');
  if (/\bdp\[|memo\[|memoization|fib\(n\s*-\s*1\)\s*\+\s*fib\(n\s*-\s*2\)/.test(c)) patterns.push('Dynamic Programming');
  if (/\bqueue\s*\.shift|BFS|breadth\s*first|while\s*\(\s*queue\s*\.length/.test(c)) patterns.push('BFS');
  if (/\bstack\s*\.pop|DFS|depth\s*first|recursion|\.push\s*\(/.test(c)) patterns.push('DFS/Recursion');
  if (/\bbinary\s*search|mid\s*=\s*\(low\s*\+\s*high\)|while\s*\(\s*low\s*<=\s*high/.test(c)) patterns.push('Binary Search');
  if (/\bhash\s*map|Map\s*\(\)|object\[|\.get\s*\(|\.set\s*\(/.test(c)) patterns.push('Hash Map');
  if (/\bsort\s*\(|\.sort\s*\(/.test(c)) patterns.push('Sorting');
  if (patterns.length === 0) patterns.push('Brute force / Linear');
  return patterns;
}

/**
 * Detect potential inefficiencies.
 */
export function detectInefficiencies(code) {
  const c = (code || '').toLowerCase();
  const issues = [];
  if (/\bfor\s*\([^)]*\bfor\b[^)]*\)/.test(c) && !/break|return/.test(c)) issues.push('Nested loops - consider optimizing');
  if (/\bindexOf\b|\bincludes\b/.test(c) && /\bfor\b/.test(c)) issues.push('Repeated indexOf/includes in loop can be O(n^2)');
  if (/\bregex\s*\(|new\s+RegExp\s*\(/.test(c)) issues.push('Regex in loop can be slow');
  return issues;
}

/**
 * Generate quality score 0-100 and feedback text.
 */
export function generateQualityScore(code, patterns, timeComplexity, spaceComplexity, inefficiencies) {
  let score = 70;
  if (patterns.some(p => ['Dynamic Programming', 'Two Pointers', 'Sliding Window', 'Binary Search'].includes(p))) score += 10;
  if (timeComplexity === 'O(n)' || timeComplexity.startsWith('O(n log')) score += 10;
  if (spaceComplexity === 'O(1)') score += 5;
  score -= inefficiencies.length * 5;
  score = Math.max(0, Math.min(100, score));

  let feedback = `Time: ${timeComplexity}, Space: ${spaceComplexity}. Detected patterns: ${patterns.join(', ')}.`;
  if (inefficiencies.length) feedback += ` Suggestions: ${inefficiencies.join('; ')}.`;
  else feedback += ' Code structure looks good.';

  return { qualityScore: score, feedbackText: feedback };
}

/**
 * Full rule-based analysis (sync). Returns object for aiFeedback in submission.
 */
export function analyzeCodeSync(code) {
  const timeComplexity = estimateTimeComplexity(code);
  const spaceComplexity = estimateSpaceComplexity(code);
  const patterns = detectPatterns(code);
  const inefficiencies = detectInefficiencies(code);
  const { qualityScore, feedbackText } = generateQualityScore(code, patterns, timeComplexity, spaceComplexity, inefficiencies);

  return {
    timeComplexity,
    spaceComplexity,
    patterns,
    qualityScore,
    feedbackText,
  };
}

/**
 * Generate a short interviewer hint based on the current code.
 * This is intentionally concise so it can be shown in real time.
 */
export function generateInterviewHint(code, language = 'javascript', question = '') {
  const analysis = analyzeCodeSync(code);
  const hints = [];

  if (analysis.patterns.includes('Brute force / Linear')) {
    hints.push('Look for repeated work and try reducing the search space or caching intermediate results.');
  }

  if (analysis.patterns.includes('Hash Map')) {
    hints.push('A hash map may help you trade extra space for faster lookups.');
  }

  if (analysis.patterns.includes('Two Pointers')) {
    hints.push('Check how your pointers move and whether the condition should shrink or expand the window.');
  }

  if (analysis.patterns.includes('Sliding Window')) {
    hints.push('Make sure the window is updated only when the current state stays valid.');
  }

  if (analysis.patterns.includes('Dynamic Programming')) {
    hints.push('Define the subproblem clearly and verify your transition before coding the full table.');
  }

  if (analysis.patterns.includes('Binary Search')) {
    hints.push('Double-check your boundary updates and the condition that ends the search.');
  }

  if (analysis.inefficiencies?.length) {
    hints.push(analysis.inefficiencies[0]);
  }

  if (hints.length === 0) {
    hints.push('Think about the core data structure that makes the next operation cheaper.');
  }

  const prefix = question ? 'Hint for this problem: ' : 'Hint: ';
  const suffix = language ? ` (${language.toUpperCase()})` : '';
  return `${prefix}${hints[0]}${suffix}`;
}

/**
 * Async analysis with Tavily API enrichment for AI-related feedback.
 */
export async function analyzeCode(code, language = 'javascript') {
  const result = analyzeCodeSync(code);
  try {
    const { getCodeFeedbackInsights } = await import('./tavilyService.js');
    const extra = await getCodeFeedbackInsights(result.patterns, language);
    if (extra) result.feedbackText += extra;
  } catch (_) {
    // Tavily optional; keep rule-based feedback
  }
  return result;
}
