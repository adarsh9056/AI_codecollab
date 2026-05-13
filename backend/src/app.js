import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/index.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import roomRoutes from './routes/rooms.js';
import problemRoutes from './routes/problems.js';
import runRoutes from './routes/run.js';
import submitRoutes from './routes/submit.js';
import contestRoutes from './routes/contests.js';
import interviewRoutes from './routes/interviews.js';
import analyticsRoutes from './routes/analytics.js';
import statsRoutes from './routes/stats.js';
import aiChatRoutes from './routes/aiChat.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

/* ── Middleware ── */
app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

/* ── CSRF protection for state-changing requests ── */
app.use((req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const cookieToken = req.cookies?.['csrf-token'];
  const headerToken = req.headers['x-csrf-token'];
  if (cookieToken && headerToken && cookieToken === headerToken) return next();
  if (!req.cookies?.token) return next();
  if (config.nodeEnv !== 'production') return next();
  return res.status(403).json({ message: 'CSRF token mismatch' });
});

/* ── Static files — serve uploaded avatars ── */
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

/* ── Routes ── */
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/run', runRoutes);
app.use('/api/submit', submitRoutes);
app.use('/api/contests', contestRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/ai-chat', aiChatRoutes);

/* ── Health check ── */
app.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

/* ── 404 handler ── */
app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

/* ── Global error handler ── */
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  console.error("GLOBAL ERROR =>", err);

  res.status(status).json({
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

export default app;
