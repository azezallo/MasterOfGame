import { Router } from 'express';
import { getNpcs, getNpcById, updatePlayerNotes } from '../controllers/npc.controller';

const router = Router({ mergeParams: true });

// Player UI Routes (Data Isolated)
router.get('/', getNpcs);
router.get('/:id', getNpcById);
router.patch('/:id/notes', updatePlayerNotes);

export default router;
