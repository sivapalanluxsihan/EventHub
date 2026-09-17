import { Router } from 'express';
import {
  getEvents,
  getEventById,
  createEvent,
  getOrganizerEvents,
  updateEvent,
  deleteEvent,
} from '../controllers/eventController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// Public event routes (no JWT required)
router.get('/', getEvents);

// Organizer routes (protected: requires JWT and ORGANIZER role)
// Note: '/organizer/my-events' must be defined before '/:id'
router.get(
  '/organizer/my-events',
  authenticateToken as any,
  requireRole('ORGANIZER') as any,
  getOrganizerEvents as any
);
router.post(
  '/',
  authenticateToken as any,
  requireRole('ORGANIZER') as any,
  createEvent as any
);
router.put(
  '/:id',
  authenticateToken as any,
  requireRole('ORGANIZER') as any,
  updateEvent as any
);
router.delete(
  '/:id',
  authenticateToken as any,
  requireRole('ORGANIZER') as any,
  deleteEvent as any
);

// Public route for single event retrieval by ID
router.get('/:id', getEventById);

export default router;
