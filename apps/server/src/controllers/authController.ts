import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { getDb } from '../database/index.js';
import { AuthRequest, JWTPayload, SafeUser, User } from '../types/index.js';

// Simple, robust email format validator
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const register = (req: Request, res: Response): void => {
  try {
    const { name, email, password } = req.body;

    // 1. Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ error: 'Name is required and must be a valid text.' });
      return;
    }

    if (!email || typeof email !== 'string' || !isValidEmail(email.trim())) {
      res.status(400).json({ error: 'A valid email address is required.' });
      return;
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ error: 'Password is required and must be at least 6 characters long.' });
      return;
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    const db = getDb();

    // 2. Check for duplicate email (case-insensitive)
    const existingUser = db
      .prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)')
      .get(cleanEmail);

    if (existingUser) {
      res.status(409).json({ error: 'An account with this email address already exists.' });
      return;
    }

    // 3. Hash password using bcrypt
    const saltRounds = 10;
    const passwordHash = bcrypt.hashSync(password, saltRounds);

    // 4. Insert new user (default role: USER)
    const insert = db.prepare(`
      INSERT INTO users (name, email, passwordHash, role)
      VALUES (?, ?, ?, 'USER')
    `);

    const result = insert.run(cleanName, cleanEmail, passwordHash);
    const userId = Number(result.lastInsertRowid);

    // 5. Generate JWT token
    const tokenPayload: JWTPayload = { userId, role: 'USER' };
    const token = jwt.sign(tokenPayload, config.jwtSecret, { expiresIn: '7d' });

    const safeUser: SafeUser = {
      id: userId,
      name: cleanName,
      email: cleanEmail,
      role: 'USER',
    };

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: safeUser,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error during user registration.' });
  }
};

export const login = (req: Request, res: Response): void => {
  try {
    const { email, password } = req.body;

    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      res.status(400).json({ error: 'Both email and password are required.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const db = getDb();

    const user = db
      .prepare('SELECT id, name, email, passwordHash, role, createdAt, updatedAt FROM users WHERE LOWER(email) = LOWER(?)')
      .get(cleanEmail) as User | undefined;

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    // Secure password comparison
    const isPasswordValid = bcrypt.compareSync(password, user.passwordHash);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    // Generate JWT token
    const tokenPayload: JWTPayload = { userId: user.id, role: user.role };
    const token = jwt.sign(tokenPayload, config.jwtSecret, { expiresIn: '7d' });

    const safeUser: SafeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res.status(200).json({
      message: 'Login successful',
      token,
      user: safeUser,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error during login.' });
  }
};

export const getProfile = (req: AuthRequest, res: Response): void => {
  // req.user is populated by authenticateToken middleware
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }

  res.status(200).json({
    user: req.user,
  });
};

export const updateProfile = (req: AuthRequest, res: Response): void => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const { name, email, role, id, password, passwordHash } = req.body;

    // Security check: normal user cannot change role, id, or passwordHash directly
    if (role !== undefined && role !== req.user.role) {
      res.status(403).json({ error: 'Modifying user role is not permitted.' });
      return;
    }

    if (id !== undefined && Number(id) !== req.user.id) {
      res.status(400).json({ error: 'Modifying user ID is not permitted.' });
      return;
    }

    if (password !== undefined || passwordHash !== undefined) {
      res.status(400).json({ error: 'Password cannot be modified via profile update.' });
      return;
    }

    let updatedName = req.user.name;
    let updatedEmail = req.user.email;

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        res.status(400).json({ error: 'Name must be a valid non-empty string.' });
        return;
      }
      updatedName = name.trim();
    }

    if (email !== undefined) {
      if (typeof email !== 'string' || !isValidEmail(email.trim())) {
        res.status(400).json({ error: 'A valid email address is required.' });
        return;
      }
      const candidateEmail = email.trim().toLowerCase();

      // Check if new email is taken by another account
      if (candidateEmail !== req.user.email.toLowerCase()) {
        const db = getDb();
        const existing = db
          .prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id != ?')
          .get(candidateEmail, req.user.id);

        if (existing) {
          res.status(409).json({ error: 'This email is already registered to another user.' });
          return;
        }
      }

      updatedEmail = candidateEmail;
    }

    const db = getDb();
    db.prepare(`
      UPDATE users
      SET name = ?, email = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(updatedName, updatedEmail, req.user.id);

    const updatedUser = db
      .prepare('SELECT id, name, email, role, createdAt, updatedAt FROM users WHERE id = ?')
      .get(req.user.id) as SafeUser;

    res.status(200).json({
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error during profile update.' });
  }
};

export const logout = (_req: Request, res: Response): void => {
  // JWT authentication is stateless; client removes stored token from AsyncStorage
  res.status(200).json({
    message: 'Logged out successfully. Please remove your stored token on the client.',
  });
};
