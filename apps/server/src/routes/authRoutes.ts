import { Router } from 'express';
import { register, login, getProfile, updateProfile, logout } from '../controllers/authController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);

// Protected routes (Requires valid JWT)
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);

// Role authorization foundation verification route
router.get('/test-organizer', authenticateToken, requireRole('ORGANIZER'), (_req, res) => {
  res.status(200).json({ status: 'ok', message: 'Authorized as ORGANIZER' });
});

export default router;
