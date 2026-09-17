import { Response } from 'express';
import { getDb } from '../database/index.js';
import { AuthRequest, Booking } from '../types/index.js';
import { BookingWithEvent } from '../types/booking.js';

/**
 * POST /api/bookings
 * Authenticated user creates a booking for an event.
 * Safely checks available seats and decrements seat count inside a SQLite transaction.
 */
export const createBooking = (req: AuthRequest, res: Response): void => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { eventId, numberOfSeats } = req.body;

    // Validate eventId
    if (
      eventId === undefined ||
      eventId === null ||
      typeof eventId !== 'number' ||
      !Number.isInteger(eventId) ||
      eventId <= 0
    ) {
      res.status(400).json({ error: 'Valid eventId is required (must be a positive integer)' });
      return;
    }

    // Validate numberOfSeats
    if (
      numberOfSeats === undefined ||
      numberOfSeats === null ||
      typeof numberOfSeats !== 'number' ||
      !Number.isInteger(numberOfSeats) ||
      numberOfSeats <= 0
    ) {
      res.status(400).json({
        error: 'Valid numberOfSeats is required (must be an integer greater than 0)',
      });
      return;
    }

    const db = getDb();

    // Check if event exists
    const event = db
      .prepare('SELECT id, name, availableSeats FROM events WHERE id = ?')
      .get(eventId) as { id: number; name: string; availableSeats: number } | undefined;

    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    // Check seat availability
    if (event.availableSeats < numberOfSeats) {
      res.status(400).json({ error: 'Not enough seats available.' });
      return;
    }

    // Atomic transaction: re-verify available seats, decrement seats, and insert booking
    const performBookingTx = db.transaction((uId: number, eId: number, seats: number) => {
      const currentEvent = db
        .prepare('SELECT id, availableSeats FROM events WHERE id = ?')
        .get(eId) as { id: number; availableSeats: number } | undefined;

      if (!currentEvent) {
        throw { status: 404, message: 'Event not found' };
      }

      if (currentEvent.availableSeats < seats) {
        throw { status: 400, message: 'Not enough seats available.' };
      }

      const seatUpdateResult = db
        .prepare(
          'UPDATE events SET availableSeats = availableSeats - ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND availableSeats >= ?'
        )
        .run(seats, eId, seats);

      if (seatUpdateResult.changes === 0) {
        throw { status: 400, message: 'Not enough seats available.' };
      }

      const insertResult = db
        .prepare(
          `INSERT INTO bookings (userId, eventId, numberOfSeats, status, bookingDate, createdAt, updatedAt)
           VALUES (?, ?, ?, 'CONFIRMED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
        )
        .run(uId, eId, seats);

      const createdBooking = db
        .prepare(
          `SELECT id, userId, eventId, numberOfSeats, status, bookingDate, createdAt, updatedAt
           FROM bookings
           WHERE id = ?`
        )
        .get(insertResult.lastInsertRowid) as Booking;

      return createdBooking;
    });

    const booking = performBookingTx(userId, eventId, numberOfSeats);

    res.status(201).json({
      message: 'Booking confirmed successfully',
      booking,
    });
  } catch (error: any) {
    if (error && typeof error === 'object' && error.status && error.message) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Internal server error while processing booking' });
  }
};

/**
 * GET /api/bookings
 * Returns all bookings belonging exclusively to the authenticated user.
 * Joins event data so client receives rich display metadata.
 */
export const getUserBookings = (req: AuthRequest, res: Response): void => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const db = getDb();
    const bookings = db
      .prepare(
        `SELECT 
           b.id,
           b.userId,
           b.eventId,
           b.numberOfSeats,
           b.status,
           b.bookingDate,
           b.createdAt,
           b.updatedAt,
           e.name AS eventName,
           e.image AS eventImage,
           e.date,
           e.time,
           e.location,
           e.category,
           e.price
         FROM bookings b
         JOIN events e ON b.eventId = e.id
         WHERE b.userId = ?
         ORDER BY b.createdAt DESC`
      )
      .all(userId) as BookingWithEvent[];

    res.status(200).json({ bookings });
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({ error: 'Internal server error while retrieving bookings' });
  }
};

/**
 * GET /api/bookings/:id
 * Returns a single booking by ID.
 * Enforces ownership: only the user who created the booking may view it.
 */
export const getBookingById = (req: AuthRequest, res: Response): void => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const bookingId = Number(req.params.id);
    if (isNaN(bookingId) || !Number.isInteger(bookingId) || bookingId <= 0) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    const db = getDb();
    const booking = db
      .prepare(
        `SELECT 
           b.id,
           b.userId,
           b.eventId,
           b.numberOfSeats,
           b.status,
           b.bookingDate,
           b.createdAt,
           b.updatedAt,
           e.name AS eventName,
           e.image AS eventImage,
           e.date,
           e.time,
           e.location,
           e.category,
           e.price
         FROM bookings b
         JOIN events e ON b.eventId = e.id
         WHERE b.id = ?`
      )
      .get(bookingId) as BookingWithEvent | undefined;

    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    // Ownership check: user can only view their own booking
    if (booking.userId !== userId) {
      res.status(403).json({ error: 'Access denied: You do not have permission to view this booking' });
      return;
    }

    res.status(200).json({ booking });
  } catch (error) {
    console.error('Error fetching booking by id:', error);
    res.status(500).json({ error: 'Internal server error while retrieving booking' });
  }
};

/**
 * DELETE /api/bookings/:id
 * Cancels a confirmed booking and returns the reserved seats to the event.
 * Performed atomically within a SQLite transaction.
 * Does not permanently delete the record to maintain audit history.
 */
export const cancelBooking = (req: AuthRequest, res: Response): void => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const bookingId = Number(req.params.id);
    if (isNaN(bookingId) || !Number.isInteger(bookingId) || bookingId <= 0) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    const db = getDb();
    const existing = db
      .prepare('SELECT id, userId, eventId, numberOfSeats, status FROM bookings WHERE id = ?')
      .get(bookingId) as
      | { id: number; userId: number; eventId: number; numberOfSeats: number; status: string }
      | undefined;

    if (!existing) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    // Verify ownership
    if (existing.userId !== userId) {
      res.status(403).json({ error: 'Access denied: You do not have permission to cancel this booking' });
      return;
    }

    // Verify booking is not already cancelled
    if (existing.status === 'CANCELLED') {
      res.status(400).json({ error: 'Booking is already cancelled' });
      return;
    }

    // Atomic transaction: mark as CANCELLED and restore available seats
    const performCancellationTx = db.transaction(
      (bId: number, eId: number, seats: number) => {
        const updateBooking = db
          .prepare(
            `UPDATE bookings 
             SET status = 'CANCELLED', updatedAt = CURRENT_TIMESTAMP 
             WHERE id = ? AND status = 'CONFIRMED'`
          )
          .run(bId);

        if (updateBooking.changes === 0) {
          throw { status: 400, message: 'Booking is already cancelled' };
        }

        db.prepare(
          `UPDATE events 
           SET availableSeats = availableSeats + ?, updatedAt = CURRENT_TIMESTAMP 
           WHERE id = ?`
        ).run(seats, eId);

        const updated = db
          .prepare(
            `SELECT id, userId, eventId, numberOfSeats, status, bookingDate, createdAt, updatedAt
             FROM bookings
             WHERE id = ?`
          )
          .get(bId) as Booking;

        return updated;
      }
    );

    const cancelledBooking = performCancellationTx(
      existing.id,
      existing.eventId,
      existing.numberOfSeats
    );

    res.status(200).json({
      message: 'Booking cancelled successfully',
      booking: cancelledBooking,
    });
  } catch (error: any) {
    if (error && typeof error === 'object' && error.status && error.message) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    console.error('Error cancelling booking:', error);
    res.status(500).json({ error: 'Internal server error while cancelling booking' });
  }
};
