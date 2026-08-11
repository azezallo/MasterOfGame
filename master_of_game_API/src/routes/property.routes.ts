import { Router } from 'express';
import { getPlayerProperty, payRent, toggleBackpack, storageTransfer } from '../controllers/property.controller';

const router = Router({ mergeParams: true });

router.get('/', getPlayerProperty);
router.post('/pay-rent', payRent);
router.post('/toggle-backpack', toggleBackpack);
router.post('/storage-transfer', storageTransfer);

export default router;
