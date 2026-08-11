import { Router } from 'express';
import {
  getKnownOrganizations,
  getOrganizationById,
  updateOrganizationNotes,
} from '../controllers/organization.controller';

const router = Router({ mergeParams: true });

router.get('/', getKnownOrganizations);
router.get('/:id', getOrganizationById);
router.patch('/:id/notes', updateOrganizationNotes);

export default router;
