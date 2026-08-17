import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../errors/app.errors';
import { OrganizationRepository } from '../repositories/organization.repository';
import { NpcRepository } from '../repositories/npc.repository';
import {
  Organization,
  RankDefinition,
  UpdatePlayerAffiliationInput,
  UpdateOrganizationStatusInput,
  CreateOrganizationInput,
  GetOrganizationsListFilter,
  GetOrganizationMembersFilter,
  OrganizationDetailsResult,
  OrganizationMemberSummary,
  IsolatedPublicOrganization,
  PlayerOrganizationAffiliation,
} from '../types/organization.types';
import { CreateOrganizationInputSchema } from '../schemas/organization.schema';

export function generateMermaidGraph(hierarchy: RankDefinition[]): string {
  if (!hierarchy || hierarchy.length === 0) {
    return 'graph TD\n  empty["Порожня ієрархія"]';
  }

  const lines: string[] = ['graph TD'];

  for (const rank of hierarchy) {
    const safeName = rank.rank_name.replace(/"/g, '\\"');
    lines.push(`  ${rank.rank_id}["${safeName}"]`);
  }

  for (const rank of hierarchy) {
    if (rank.superior_id) {
      lines.push(`  ${rank.superior_id} --> ${rank.rank_id}`);
    }
  }

  return lines.join('\n');
}

export class OrganizationService {
  constructor(
    private orgRepo: OrganizationRepository,
    private npcRepo?: NpcRepository
  ) {}

  // Agent Tool 1: get_organizations_list
  public getOrganizationsList(filter?: GetOrganizationsListFilter) {
    const orgs = this.orgRepo.findByFilter(filter);
    return orgs.map(org => ({
      id: org.id,
      name: org.name,
      type: org.type,
      is_secret: org.is_secret,
      description: org.description,
    }));
  }

  // Agent Tool 2: get_organization_details
  public getOrganizationDetails(organizationId: string): OrganizationDetailsResult {
    const org = this.orgRepo.findById(organizationId);
    if (!org) {
      throw new AppError(`Organization '${organizationId}' not found`, 404);
    }

    return {
      ...org,
      mermaid_graph: generateMermaidGraph(org.hierarchy),
    };
  }

  // Agent Tool 3: get_organization_objectives
  public getOrganizationObjectives(organizationId: string) {
    const org = this.orgRepo.findById(organizationId);
    if (!org) {
      throw new AppError(`Organization '${organizationId}' not found`, 404);
    }

    return {
      organization_id: org.id,
      objectives: org.objectives,
    };
  }

  // Agent Tool 4: get_organization_members
  public getOrganizationMembers(
    organizationId: string,
    filter?: GetOrganizationMembersFilter
  ): OrganizationMemberSummary[] {
    if (!this.npcRepo) {
      return [];
    }

    const allNpcs = this.npcRepo.findAll();
    const members: OrganizationMemberSummary[] = [];

    for (const npc of allNpcs) {
      const orgEntry = npc.organizations?.find(o => o.organization_id === organizationId);
      if (!orgEntry) continue;

      if (filter?.rank_id && orgEntry.rank_id !== filter.rank_id) {
        continue;
      }

      const currentLocation =
        npc.spatial_presence?.current_location_id ||
        (npc as any).current_location_id ||
        '';

      if (filter?.location_id && currentLocation !== filter.location_id) {
        continue;
      }

      members.push({
        npc_id: npc.npc_id,
        name: npc.public_profile.name,
        rank_id: orgEntry.rank_id,
        current_location_id: currentLocation,
      });
    }

    return members;
  }

  // Agent Tool 5: update_player_organization_affiliation
  public updatePlayerOrganizationAffiliation(
    organizationId: string,
    updates: UpdatePlayerAffiliationInput
  ): PlayerOrganizationAffiliation {
    const org = this.orgRepo.findById(organizationId);
    if (!org) {
      throw new AppError(`Organization '${organizationId}' not found`, 404);
    }

    return this.orgRepo.updatePlayerAffiliation(organizationId, updates);
  }

  // Agent Tool 6: update_organization_status
  public updateOrganizationStatus(
    organizationId: string,
    updates: UpdateOrganizationStatusInput
  ): Organization {
    const org = this.orgRepo.findById(organizationId);
    if (!org) {
      throw new AppError(`Organization '${organizationId}' not found`, 404);
    }

    const updated = this.orgRepo.updateStatus(organizationId, updates);
    if (!updated) {
      throw new AppError(`Failed to update organization '${organizationId}'`, 500);
    }

    return updated;
  }

  // Agent Tool 7: create_organization
  public createOrganization(input: CreateOrganizationInput): Organization {
    const validated = CreateOrganizationInputSchema.parse(input);

    const orgId = validated.id || `org_${uuidv4().replace(/-/g, '').slice(0, 10)}`;

    const newOrg: Organization = {
      id: orgId,
      name: validated.name,
      type: validated.type,
      is_secret: validated.is_secret,
      is_known_to_player: validated.is_known_to_player ?? false,
      description: validated.description,
      hierarchy: validated.hierarchy || [],
      objectives: validated.objectives || { public: [], secret: [] },
      resources: validated.resources || {
        wealth_level: 'medium',
        manpower_level: 'medium',
        influence: 'medium',
      },
    };

    return this.orgRepo.create(newOrg);
  }

  // UI Query Method 1: getPlayerKnownOrganizations
  public getPlayerKnownOrganizations(): IsolatedPublicOrganization[] {
    const knownOrgs = this.orgRepo.findKnownToPlayer();

    return knownOrgs.map(org => this.toPublicIsolatedOrganization(org));
  }

  // UI Query Method 2: getOrganizationDossier
  public getOrganizationDossier(organizationId: string): IsolatedPublicOrganization {
    const org = this.orgRepo.findById(organizationId);
    if (!org || !org.is_known_to_player) {
      throw new AppError(`Organization '${organizationId}' not found`, 404);
    }

    return this.toPublicIsolatedOrganization(org);
  }

  // UI Query Method 3: updatePlayerNotes
  public updatePlayerNotes(organizationId: string, notes: string): IsolatedPublicOrganization {
    const org = this.orgRepo.findById(organizationId);
    if (!org || !org.is_known_to_player) {
      throw new AppError(`Organization '${organizationId}' not found`, 404);
    }

    this.orgRepo.updatePlayerNotes(organizationId, notes);
    return this.getOrganizationDossier(organizationId);
  }

  // Helper method for Data Isolation
  private toPublicIsolatedOrganization(org: Organization): IsolatedPublicOrganization {
    const affiliation = this.orgRepo.getPlayerAffiliation(org.id);

    return {
      id: org.id,
      name: org.name,
      type: org.type,
      is_secret: org.is_secret,
      is_known_to_player: org.is_known_to_player,
      description: org.description,
      hierarchy: org.hierarchy,
      objectives: {
        public: org.objectives?.public || [],
      },
      resources: org.resources,
      mermaid_graph: generateMermaidGraph(org.hierarchy),
      affiliation: affiliation,
      player_notes: affiliation?.player_notes || '',
      ...(org.created_at !== undefined && { created_at: org.created_at }),
      ...(org.updated_at !== undefined && { updated_at: org.updated_at }),
    };
  }
}
