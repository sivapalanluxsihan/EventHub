import { Router } from 'express';
import { getOrganizerEventBookings } from '../controllers/bookingController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/organizer/events/:eventId/bookings
// Protected route: requires valid JWT with ORGANIZER role
router.get(
  '/events/:eventId/bookings',
  authenticateToken as any,
  requireRole('ORGANIZER') as any,
  getOrganizerEventBookings as any
);

export default router;
