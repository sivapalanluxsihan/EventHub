import { Router } from 'express';
import {
  createBooking,
  getUserBookings,
  getBookingById,
  cancelBooking,
} from '../controllers/bookingController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// All booking routes require authentication
router.post('/', authenticateToken, createBooking);
router.get('/', authenticateToken, getUserBookings);
router.get('/:id', authenticateToken, getBookingById);
router.delete('/:id', authenticateToken, cancelBooking);

export default router;
