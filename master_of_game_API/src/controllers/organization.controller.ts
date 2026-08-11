import { Request, Response, NextFunction } from 'express';
import { DatabaseRepository } from '../persistence/database_repository';
import { PersistenceService } from '../persistence/persistence_service';
import { OrganizationService } from '../services/organization.service';
import { UpdateOrganizationNotesInputSchema } from '../schemas/organization.schema';

async function getOrganizationService(req: Request): Promise<OrganizationService> {
  const sessionId = (req.params.sessionId as string) || '';
  const rawPlayerId = (req as any).user?.id;
  const playerId = rawPlayerId !== undefined && rawPlayerId !== null ? String(rawPlayerId) : 'default_player';

  const persistenceService = new PersistenceService();
  let repo = await persistenceService.loadSessionRepo(playerId, sessionId);
  if (!repo) {
    repo = new DatabaseRepository();
    await repo.initializeDB(playerId, sessionId);
  }
  const orgRepo = repo.getOrganizationRepository();
  const npcRepo = repo.getNpcRepository();
  return new OrganizationService(orgRepo, npcRepo);
}

// GET /sessions/:sessionId/organizations
export const getKnownOrganizations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgService = await getOrganizationService(req);
    const organizations = orgService.getPlayerKnownOrganizations();

    return res.json({
      success: true,
      data: organizations,
    });
  } catch (error) {
    next(error);
  }
};

// GET /sessions/:sessionId/organizations/:id
export const getOrganizationById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgService = await getOrganizationService(req);
    const orgId = (req.params.id as string) || '';
    const dossier = orgService.getOrganizationDossier(orgId);

    return res.json({
      success: true,
      data: dossier,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /sessions/:sessionId/organizations/:id/notes
export const updateOrganizationNotes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgService = await getOrganizationService(req);
    const orgId = (req.params.id as string) || '';

    const validation = UpdateOrganizationNotesInputSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: validation.error.issues,
      });
    }

    const notesText = validation.data.notes !== undefined ? validation.data.notes : (validation.data.content || '');
    const updatedDossier = orgService.updatePlayerNotes(orgId, notesText);

    return res.json({
      success: true,
      data: updatedDossier,
    });
  } catch (error) {
    next(error);
  }
};
