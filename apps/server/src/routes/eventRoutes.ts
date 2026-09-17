import { Router } from 'express';
import { getEvents, getEventById } from '../controllers/eventController.js';

const router = Router();

// Public event routes (no JWT required)
router.get('/', getEvents);
router.get('/:id', getEventById);

export default router;
