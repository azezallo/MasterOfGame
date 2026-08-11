import { Router } from 'express';
import { getPlayerState } from '../controllers/player_state.controller';

const router = Router({ mergeParams: true });

router.get('/', getPlayerState);

export default router;
