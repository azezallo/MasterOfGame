import { Router } from 'express';
import { getSessions } from '../controllers/session.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);
router.get('/', getSessions);

export default router;
