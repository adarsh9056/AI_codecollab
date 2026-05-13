import dotenv from 'dotenv';

dotenv.config();

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI is required in .env — no localhost fallback.');
}

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

  // Tavily (AI search — optional)
  tavilyApiKey: process.env.TAVILY_API_KEY || '',

  // SMTP for OTP emails (optional)
  smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
  smtpPort: process.env.SMTP_PORT || '587',
  smtpSecure: process.env.SMTP_SECURE || 'false',
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  emailFrom: process.env.EMAIL_FROM || process.env.SMTP_USER || '',
  resendApiKey: process.env.RESEND_API_KEY || '',
};

if (config.nodeEnv === 'production' && config.jwtSecret === 'dev-secret-change-me') {
  throw new Error('FATAL: JWT_SECRET must be set in production. Never use the default secret.');
}

/**
 * Judge0 CE — FREE official endpoint (no API key, no RapidAPI).
 * https://ce.judge0.com
 */
export const JUDGE0_URL = 'https://ce.judge0.com';

/** Language IDs for Judge0 CE */
export const LANG_IDS = {
  javascript: 63,  // Node.js (12.14.0)
  python:     71,  // Python 3 (3.8.1)
  cpp:        54,  // C++ (GCC 9.2.0)
  java:       62,  // Java (OpenJDK 13.0.1)
};

/** Execution limits */
export const LIMITS = {
  maxCodeLength: 50_000,
  maxStdinLength: 10_000,
  defaultTimeoutMs: 5000,
  maxTimeoutMs: 15_000,
  contestDurationMs: 25 * 60 * 1000,
};
