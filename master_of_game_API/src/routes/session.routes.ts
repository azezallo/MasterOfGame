import { Router } from 'express';
import { getSessions, createSession } from '../controllers/session.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import locationRoutes from './location.routes';
import itemRoutes from './item.routes';
import propertyRoutes from './property.routes';
import npcRoutes from './npc.routes';
import worldStateRoutes from './world_state.routes';
import playerStateRoutes from './player_state.routes';
import organizationRoutes from './organization.routes';
import magicRoutes from './magic.routes';

const router = Router();

router.use(authMiddleware);
router.use('/:sessionId/locations', locationRoutes);
router.use('/:sessionId/items', itemRoutes);
router.use('/:sessionId/property', propertyRoutes);
router.use('/:sessionId/npcs', npcRoutes);
router.use('/:sessionId/world-state', worldStateRoutes);
router.use('/:sessionId/player-state', playerStateRoutes);
router.use('/:sessionId/organizations', organizationRoutes);
router.use('/:sessionId/magic', magicRoutes);

router.get('/', getSessions);
router.post('/', createSession);

export default router;
