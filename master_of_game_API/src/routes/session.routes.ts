import { Router } from 'express';
import { getSessions, createSession } from '../controllers/session.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import locationRoutes from './location.routes';

const router = Router();

router.use(authMiddleware);
router.use('/:sessionId/locations', locationRoutes);

router.get('/', getSessions);
router.post('/', createSession);

export default router;
