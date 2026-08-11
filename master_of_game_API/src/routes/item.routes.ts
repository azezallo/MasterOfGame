import { Router } from 'express';
import { getItems, getItemById } from '../controllers/item.controller';

const router = Router({ mergeParams: true });

// Player UI Routes (Isolated Data)
router.get('/', getItems);
router.get('/:itemId', getItemById);

export default router;
