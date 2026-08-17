import { Router } from 'express';
import { indexRecord, searchMemory } from '../controllers/semantic_memory.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.post('/index', indexRecord);
router.post('/search', searchMemory);

export default router;
