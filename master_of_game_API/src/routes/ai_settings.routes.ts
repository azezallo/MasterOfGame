import { Router } from 'express';
import { getSettings, updateSettings, testConnection } from '../controllers/ai_settings.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/settings', getSettings as any);
router.put('/settings', updateSettings as any);
router.post('/test-connection', testConnection as any);

export default router;
