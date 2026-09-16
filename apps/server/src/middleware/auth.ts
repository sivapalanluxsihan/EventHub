import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { getDb } from '../database/index.js';
import { AuthRequest, JWTPayload, SafeUser, UserRole } from '../types/index.js';

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    res.status(401).json({ error: 'Access denied. Authentication token required.' });
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({ error: 'Invalid token format. Expected Bearer <token>.' });
    return;
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JWTPayload;
    
    // Validate that user still exists in database
    const db = getDb();
    const user = db
      .prepare('SELECT id, name, email, role, createdAt, updatedAt FROM users WHERE id = ?')
      .get(decoded.userId) as SafeUser | undefined;

    if (!user) {
      res.status(401).json({ error: 'User associated with token no longer exists.' });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
};

export const requireRole = (role: UserRole) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    if (req.user.role !== role) {
      res.status(403).json({ error: `Access forbidden: '${role}' role required.` });
      return;
    }

    next();
  };
};
