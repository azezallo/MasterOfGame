import { Router } from 'express';
import { streamTurn, compressContext, getHistory } from '../controllers/agentic_loop.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware as any);

router.get('/history', getHistory as any);
router.post('/stream', streamTurn as any);
router.post('/compress', compressContext as any);

export default router;
