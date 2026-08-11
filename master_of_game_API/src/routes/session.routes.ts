import { Router } from 'express';
import { getSessions, createSession } from '../controllers/session.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import locationRoutes from './location.routes';
import itemRoutes from './item.routes';
import propertyRoutes from './property.routes';

const router = Router();

router.use(authMiddleware);
router.use('/:sessionId/locations', locationRoutes);
router.use('/:sessionId/items', itemRoutes);
router.use('/:sessionId/property', propertyRoutes);

router.get('/', getSessions);
router.post('/', createSession);

export default router;
