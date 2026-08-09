import { Router } from 'express';
import { getMapLocations } from '../controllers/location.controller';
// Note: This router is mounted under /sessions/:sessionId/locations
// so we need mergeParams: true to access sessionId
const router = Router({ mergeParams: true });

// GET /sessions/:sessionId/locations
router.get('/', getMapLocations);

export default router;
