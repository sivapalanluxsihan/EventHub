import express, { Request, Response } from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { initDatabase, getDb } from './database/index.js';
import authRoutes from './routes/authRoutes.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize SQLite Database and Tables
initDatabase();

// Health check endpoint (Strictly matching project requirement)
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    message: 'EventHub API is running',
  });
});

// Database diagnostics endpoint
app.get('/api/health/db', (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    const eventCount = db.prepare('SELECT COUNT(*) as count FROM events').get() as { count: number };
    const bookingCount = db.prepare('SELECT COUNT(*) as count FROM bookings').get() as { count: number };

    res.status(200).json({
      database: 'connected',
      tables: {
        users: userCount.count,
        events: eventCount.count,
        bookings: bookingCount.count,
      },
    });
  } catch (error) {
    res.status(500).json({
      database: 'error',
      error: error instanceof Error ? error.message : 'Unknown database error',
    });
  }
});

// Authentication routes
app.use('/api/auth', authRoutes);

// Start server
app.listen(config.port, () => {
  console.log(`[EventHub API] Server is listening on http://localhost:${config.port}`);
});
