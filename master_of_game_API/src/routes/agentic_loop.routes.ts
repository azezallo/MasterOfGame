import { Router } from 'express';
import { streamTurn, compressContext, getHistory, reconnectStream } from '../controllers/agentic_loop.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/history', getHistory);
router.get('/stream', reconnectStream);
router.post('/stream', streamTurn);
router.post('/compress', compressContext);

export default router;
