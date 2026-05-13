/**
 * Tavily Search API integration for AI-enhanced code feedback.
 * Uses TAVILY_API_KEY from env. See https://docs.tavily.com/
 */

import { config } from '../config/index.js';

const TAVILY_SEARCH_URL = 'https://api.tavily.com/search';

export async function tavilySearch(query, options = {}) {
  const apiKey = config.tavilyApiKey;
  if (!apiKey) return null;
  try {
    const res = await fetch(TAVILY_SEARCH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: options.search_depth || 'basic',
        max_results: options.max_results ?? 3,
        include_answer: options.include_answer ?? true,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Tavily search error:', err.message);
    return null;
  }
}

/**
 * Get coding/DSA tips relevant to detected patterns for feedback.
 */
export async function getCodeFeedbackInsights(patterns, language = 'javascript') {
  if (!patterns?.length) return '';
  const query = `${language} DSA ${patterns.slice(0, 2).join(' ')} best practices time complexity`;
  const result = await tavilySearch(query, { max_results: 2, include_answer: true });
  if (!result?.answer) {
    const results = result?.results || [];
    if (results.length) return ` Ref: ${results[0].title} - ${(results[0].content || '').slice(0, 150)}...`;
    return '';
  }
  return ` Tavily: ${result.answer.slice(0, 300)}${result.answer.length > 300 ? '...' : ''}`;
}
