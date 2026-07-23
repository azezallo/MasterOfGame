import { Router } from 'express';
import { getSessions, createSession } from '../controllers/session.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);
router.get('/', getSessions);
router.post('/', createSession);

export default router;
