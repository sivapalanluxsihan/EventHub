import { Router } from 'express';
import {
  createBooking,
  getUserBookings,
  getBookingById,
  cancelBooking,
  getOrganizerEventBookings,
} from '../controllers/bookingController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// Organizer event bookings route (must come before /:id)
router.get(
  '/organizer/events/:eventId',
  authenticateToken as any,
  requireRole('ORGANIZER') as any,
  getOrganizerEventBookings as any
);

// All booking routes require authentication
router.post('/', authenticateToken, createBooking);
router.get('/', authenticateToken, getUserBookings);
router.get('/:id', authenticateToken, getBookingById);
router.delete('/:id', authenticateToken, cancelBooking);

export default router;
