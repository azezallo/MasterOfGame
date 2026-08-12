import { Router } from 'express';
import { indexRecord, searchMemory } from '../controllers/semantic_memory.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware as any);

router.post('/index', indexRecord as any);
router.post('/search', searchMemory as any);

export default router;
