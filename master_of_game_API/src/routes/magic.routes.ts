import { Router } from 'express';
import { calculateSpellCost, recalculateRegen, evaluateMagicItem } from '../controllers/magic.controller';

const router = Router({ mergeParams: true });

router.post('/spell-cost', calculateSpellCost);
router.post('/regen', recalculateRegen);
router.post('/evaluate-item', evaluateMagicItem);

export default router;
