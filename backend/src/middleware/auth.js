import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { User } from '../models/User.js';

/**
 * Verify JWT from Authorization header or cookie and attach user to req.
 */
export const authenticate = async (req, res, next) => {
  try {
    const token =
      req.cookies?.token ||
      (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : null);

    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(decoded.userId).select('-passwordHash');
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    return res.status(401).json({ message: 'Invalid token' });
  }
};

/**
 * Optional auth: attach user if token present, otherwise continue without user.
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const token =
      req.cookies?.token ||
      (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : null);

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(decoded.userId).select('-passwordHash');
    if (user) req.user = user;
    next();
  } catch {
    next();
  }
};
