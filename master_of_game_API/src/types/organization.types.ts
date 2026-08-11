import { z } from 'zod';
import {
  RankDefinitionSchema,
  OrganizationObjectivesSchema,
  OrganizationResourcesSchema,
  OrganizationSchema,
  AffiliationInteractionSchema,
  PlayerOrganizationAffiliationSchema,
  UpdatePlayerAffiliationInputSchema,
  UpdateOrganizationStatusInputSchema,
  CreateOrganizationInputSchema,
  UpdateOrganizationNotesInputSchema,
  GetOrganizationsListFilterSchema,
  GetOrganizationMembersFilterSchema,
} from '../schemas/organization.schema';

export type RankDefinition = z.infer<typeof RankDefinitionSchema>;
export type OrganizationObjectives = z.infer<typeof OrganizationObjectivesSchema>;
export type OrganizationResources = z.infer<typeof OrganizationResourcesSchema>;
export type Organization = z.infer<typeof OrganizationSchema>;

export type AffiliationInteraction = z.infer<typeof AffiliationInteractionSchema>;
export type PlayerOrganizationAffiliation = z.infer<typeof PlayerOrganizationAffiliationSchema>;

export type UpdatePlayerAffiliationInput = z.infer<typeof UpdatePlayerAffiliationInputSchema>;
export type UpdateOrganizationStatusInput = z.infer<typeof UpdateOrganizationStatusInputSchema>;
export type CreateOrganizationInput = z.infer<typeof CreateOrganizationInputSchema>;
export type UpdateOrganizationNotesInput = z.infer<typeof UpdateOrganizationNotesInputSchema>;

export type GetOrganizationsListFilter = z.infer<typeof GetOrganizationsListFilterSchema>;
export type GetOrganizationMembersFilter = z.infer<typeof GetOrganizationMembersFilterSchema>;

export interface OrganizationDetailsResult extends Organization {
  mermaid_graph: string;
}

export interface OrganizationMemberSummary {
  npc_id: string;
  name: string;
  rank_id: string | null;
  current_location_id: string;
}

export interface IsolatedPublicOrganization {
  id: string;
  name: string;
  type: string;
  is_secret: boolean;
  is_known_to_player: boolean;
  description: string;
  hierarchy: RankDefinition[];
  objectives: {
    public: string[];
  };
  resources: OrganizationResources;
  mermaid_graph: string;
  affiliation: PlayerOrganizationAffiliation | null;
  player_notes: string;
  created_at?: number;
  updated_at?: number;
}
