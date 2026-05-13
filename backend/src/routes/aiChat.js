import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { tavilySearch } from '../services/tavilyService.js';
import rateLimit from 'express-rate-limit';

const router = Router();

const chatLimiter = rateLimit({
  windowMs: 60_000,
  max: 15,
  message: { message: 'Too many AI requests — try again in a minute.' },
});

router.post('/', authenticate, chatLimiter, async (req, res, next) => {
  try {
    const { query, codeContext, language } = req.body;
    if (!query || typeof query !== 'string' || query.trim().length < 3) {
      return res.status(400).json({ message: 'Query must be at least 3 characters.' });
    }

    let searchQuery = query.trim();
    if (language) searchQuery += ` ${language}`;
    if (codeContext) {
      const snippet = codeContext.slice(0, 200).replace(/\n/g, ' ');
      searchQuery += ` code: ${snippet}`;
    }

    const result = await tavilySearch(searchQuery, {
      search_depth: 'advanced',
      max_results: 5,
      include_answer: true,
    });

    if (!result) {
      return res.status(503).json({ message: 'AI search is currently unavailable. Check your TAVILY_API_KEY.' });
    }

    const answer = result.answer || '';
    const sources = (result.results || []).map(r => ({
      title: r.title,
      url: r.url,
      snippet: (r.content || '').slice(0, 200),
    }));

    res.json({ answer, sources, query: query.trim() });
  } catch (err) {
    next(err);
  }
});

export default router;
