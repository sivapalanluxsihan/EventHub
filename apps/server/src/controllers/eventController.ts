import { Request, Response } from 'express';
import { getDb } from '../database/index.js';
import { EventSummary } from '../types/event.js';

/**
 * Public endpoint to list events with search and category filtering.
 * GET /api/events
 * Query params:
 *   - search: string (matches name, description, location, or category)
 *   - category: string (matches category, case-insensitive)
 */
export const getEvents = (req: Request, res: Response): void => {
  try {
    const db = getDb();
    const { search, category } = req.query;

    let sql = `
      SELECT id, name, image, description, date, time, location, category, price, availableSeats
      FROM events
      WHERE 1=1
    `;
    const params: any[] = [];

    // Search filter (case-insensitive across name, description, location, category)
    if (typeof search === 'string' && search.trim().length > 0) {
      const term = `%${search.trim().toLowerCase()}%`;
      sql += ` AND (
        LOWER(name) LIKE ? OR
        LOWER(description) LIKE ? OR
        LOWER(location) LIKE ? OR
        LOWER(category) LIKE ?
      )`;
      params.push(term, term, term, term);
    }

    // Category filter (case-insensitive; "All" matches everything)
    if (
      typeof category === 'string' &&
      category.trim().length > 0 &&
      category.trim().toLowerCase() !== 'all'
    ) {
      sql += ` AND LOWER(category) = LOWER(?)`;
      params.push(category.trim());
    }

    sql += ` ORDER BY date ASC, time ASC`;

    const events = db.prepare(sql).all(...params) as EventSummary[];

    res.status(200).json({ events });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to retrieve events' });
  }
};

/**
 * Public endpoint to retrieve an event by ID.
 * GET /api/events/:id
 */
export const getEventById = (req: Request, res: Response): void => {
  try {
    const eventId = Number(req.params.id);

    if (isNaN(eventId) || eventId <= 0) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const db = getDb();
    const event = db.prepare(`
      SELECT id, name, image, description, date, time, location, category, price, availableSeats
      FROM events
      WHERE id = ?
    `).get(eventId) as EventSummary | undefined;

    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    res.status(200).json({ event });
  } catch (error) {
    console.error('Error fetching event by id:', error);
    res.status(500).json({ error: 'Failed to retrieve event' });
  }
};
