import { Request, Response } from 'express';
import { getDb } from '../database/index.js';
import { AuthRequest } from '../types/index.js';
import { Event, EventSummary } from '../types/event.js';

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
    const event = db
      .prepare(
        `
      SELECT id, name, image, description, date, time, location, category, price, availableSeats
      FROM events
      WHERE id = ?
    `
      )
      .get(eventId) as EventSummary | undefined;

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

/**
 * Organizer endpoint to create a new event.
 * POST /api/events
 * Protected: requires JWT and ORGANIZER role.
 */
export const createEvent = (req: AuthRequest, res: Response): void => {
  try {
    const organizerId = req.user?.id;
    if (!organizerId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const {
      name,
      image,
      description,
      date,
      time,
      location,
      category,
      price,
      availableSeats,
    } = req.body;

    // Validation: name
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ error: 'Event name is required and cannot be empty' });
      return;
    }

    // Validation: description
    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      res.status(400).json({ error: 'Event description is required and cannot be empty' });
      return;
    }

    // Validation: date (YYYY-MM-DD)
    if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      res.status(400).json({ error: 'Valid date is required in format YYYY-MM-DD' });
      return;
    }

    // Validation: time
    if (!time || typeof time !== 'string' || time.trim().length === 0) {
      res.status(400).json({ error: 'Event time is required and cannot be empty' });
      return;
    }

    // Validation: location
    if (!location || typeof location !== 'string' || location.trim().length === 0) {
      res.status(400).json({ error: 'Event location is required and cannot be empty' });
      return;
    }

    // Validation: category
    if (!category || typeof category !== 'string' || category.trim().length === 0) {
      res.status(400).json({ error: 'Event category is required and cannot be empty' });
      return;
    }

    // Validation: price
    if (price === undefined || price === null || typeof price !== 'number' || isNaN(price) || price < 0) {
      res.status(400).json({ error: 'Valid price is required (must be a number >= 0)' });
      return;
    }

    // Validation: availableSeats
    if (
      availableSeats === undefined ||
      availableSeats === null ||
      typeof availableSeats !== 'number' ||
      !Number.isInteger(availableSeats) ||
      availableSeats < 0
    ) {
      res.status(400).json({ error: 'Valid availableSeats is required (must be an integer >= 0)' });
      return;
    }

    const db = getDb();
    const insertResult = db
      .prepare(
        `INSERT INTO events (organizerId, name, image, description, date, time, location, category, price, availableSeats, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      )
      .run(
        organizerId,
        name.trim(),
        image && typeof image === 'string' ? image.trim() : null,
        description.trim(),
        date.trim(),
        time.trim(),
        location.trim(),
        category.trim(),
        price,
        availableSeats
      );

    const createdEvent = db
      .prepare('SELECT * FROM events WHERE id = ?')
      .get(insertResult.lastInsertRowid) as Event;

    res.status(201).json({
      message: 'Event created successfully',
      event: createdEvent,
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Internal server error while creating event' });
  }
};

/**
 * Organizer endpoint to retrieve events owned by the authenticated organizer.
 * GET /api/events/organizer/my-events
 * Protected: requires JWT and ORGANIZER role.
 */
export const getOrganizerEvents = (req: AuthRequest, res: Response): void => {
  try {
    const organizerId = req.user?.id;
    if (!organizerId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const db = getDb();
    const events = db
      .prepare(
        `SELECT id, organizerId, name, image, description, date, time, location, category, price, availableSeats, createdAt, updatedAt
         FROM events
         WHERE organizerId = ?
         ORDER BY createdAt DESC`
      )
      .all(organizerId) as Event[];

    res.status(200).json({ events });
  } catch (error) {
    console.error('Error fetching organizer events:', error);
    res.status(500).json({ error: 'Internal server error while retrieving organizer events' });
  }
};

/**
 * Organizer endpoint to update an owned event.
 * PUT /api/events/:id
 * Protected: requires JWT and ORGANIZER role.
 */
export const updateEvent = (req: AuthRequest, res: Response): void => {
  try {
    const organizerId = req.user?.id;
    if (!organizerId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const eventId = Number(req.params.id);
    if (isNaN(eventId) || eventId <= 0) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const db = getDb();
    const existing = db
      .prepare('SELECT * FROM events WHERE id = ?')
      .get(eventId) as Event | undefined;

    if (!existing) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    // Verify ownership
    if (existing.organizerId !== organizerId) {
      res.status(403).json({ error: 'Access denied: You do not have permission to modify this event' });
      return;
    }

    const {
      name,
      image,
      description,
      date,
      time,
      location,
      category,
      price,
      availableSeats,
    } = req.body;

    // Optional field validations
    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      res.status(400).json({ error: 'Event name cannot be empty' });
      return;
    }

    if (description !== undefined && (typeof description !== 'string' || description.trim().length === 0)) {
      res.status(400).json({ error: 'Event description cannot be empty' });
      return;
    }

    if (date !== undefined && (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date.trim()))) {
      res.status(400).json({ error: 'Valid date is required in format YYYY-MM-DD' });
      return;
    }

    if (time !== undefined && (typeof time !== 'string' || time.trim().length === 0)) {
      res.status(400).json({ error: 'Event time cannot be empty' });
      return;
    }

    if (location !== undefined && (typeof location !== 'string' || location.trim().length === 0)) {
      res.status(400).json({ error: 'Event location cannot be empty' });
      return;
    }

    if (category !== undefined && (typeof category !== 'string' || category.trim().length === 0)) {
      res.status(400).json({ error: 'Event category cannot be empty' });
      return;
    }

    if (price !== undefined && (typeof price !== 'number' || isNaN(price) || price < 0)) {
      res.status(400).json({ error: 'Price must be a number >= 0' });
      return;
    }

    if (
      availableSeats !== undefined &&
      (typeof availableSeats !== 'number' || !Number.isInteger(availableSeats) || availableSeats < 0)
    ) {
      res.status(400).json({ error: 'availableSeats must be an integer >= 0' });
      return;
    }

    const updatedName = name !== undefined ? name.trim() : existing.name;
    const updatedImage = image !== undefined ? (image ? image.trim() : null) : existing.image;
    const updatedDescription = description !== undefined ? description.trim() : existing.description;
    const updatedDate = date !== undefined ? date.trim() : existing.date;
    const updatedTime = time !== undefined ? time.trim() : existing.time;
    const updatedLocation = location !== undefined ? location.trim() : existing.location;
    const updatedCategory = category !== undefined ? category.trim() : existing.category;
    const updatedPrice = price !== undefined ? price : existing.price;
    const updatedAvailableSeats = availableSeats !== undefined ? availableSeats : existing.availableSeats;

    db.prepare(
      `UPDATE events
       SET name = ?,
           image = ?,
           description = ?,
           date = ?,
           time = ?,
           location = ?,
           category = ?,
           price = ?,
           availableSeats = ?,
           updatedAt = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(
      updatedName,
      updatedImage,
      updatedDescription,
      updatedDate,
      updatedTime,
      updatedLocation,
      updatedCategory,
      updatedPrice,
      updatedAvailableSeats,
      eventId
    );

    const updatedEvent = db
      .prepare('SELECT * FROM events WHERE id = ?')
      .get(eventId) as Event;

    res.status(200).json({
      message: 'Event updated successfully',
      event: updatedEvent,
    });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Internal server error while updating event' });
  }
};

/**
 * Organizer endpoint to delete an owned event.
 * DELETE /api/events/:id
 * Protected: requires JWT and ORGANIZER role.
 * Prevents deletion if existing bookings exist to preserve user reservation history.
 */
export const deleteEvent = (req: AuthRequest, res: Response): void => {
  try {
    const organizerId = req.user?.id;
    if (!organizerId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const eventId = Number(req.params.id);
    if (isNaN(eventId) || eventId <= 0) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const db = getDb();
    const existing = db
      .prepare('SELECT * FROM events WHERE id = ?')
      .get(eventId) as Event | undefined;

    if (!existing) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    // Verify ownership
    if (existing.organizerId !== organizerId) {
      res.status(403).json({ error: 'Access denied: You do not have permission to delete this event' });
      return;
    }

    // Safe check: verify if bookings exist for this event
    const bookingCountResult = db
      .prepare('SELECT COUNT(*) as count FROM bookings WHERE eventId = ?')
      .get(eventId) as { count: number };

    if (bookingCountResult.count > 0) {
      res.status(400).json({
        error:
          'Cannot delete event with existing bookings. Event has attendee reservations.',
      });
      return;
    }

    // Safe to delete
    db.prepare('DELETE FROM events WHERE id = ?').run(eventId);

    res.status(200).json({
      message: 'Event deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Internal server error while deleting event' });
  }
};

