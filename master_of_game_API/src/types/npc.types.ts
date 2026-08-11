import { z } from 'zod';
import {
  NpcLifecycleStatusEnum,
  NpcContextModeEnum,
  PublicProfileSchema,
  PrivateProfileSchema,
  SecretDiscoveryStatusEnum,
  NpcSecretSchema,
  MemoryEventSchema,
  KnowledgeSchema,
  PlayerNotesSchema,
  NpcRelationshipSchema,
  NpcOrganizationSchema,
  SpatialPresenceSchema,
  RoutineItemSchema,
  NpcSchema,
  CreateNpcInputSchema,
  UpdateNpcPublicProfileInputSchema,
  UpdateNpcStatusInputSchema,
  UpdateNpcLocationInputSchema,
  UpdateNpcRelationshipInputSchema,
  UpdateNpcOrganizationInputSchema,
  AddNpcSecretInputSchema,
  AddMemoryEventInputSchema,
  UpdateSubjectiveThoughtsInputSchema,
  UpdatePlayerNotesInputSchema
} from '../schemas/npc.schema';

export type NpcLifecycleStatus = z.infer<typeof NpcLifecycleStatusEnum>;
export type NpcContextMode = z.infer<typeof NpcContextModeEnum>;
export type PublicProfile = z.infer<typeof PublicProfileSchema>;
export type PrivateProfile = z.infer<typeof PrivateProfileSchema>;
export type SecretDiscoveryStatus = z.infer<typeof SecretDiscoveryStatusEnum>;
export type NpcSecret = z.infer<typeof NpcSecretSchema>;
export type NpcMemoryEvent = z.infer<typeof MemoryEventSchema>;
export type Knowledge = z.infer<typeof KnowledgeSchema>;
export type PlayerNotes = z.infer<typeof PlayerNotesSchema>;
export type NpcRelationship = z.infer<typeof NpcRelationshipSchema>;
export type NpcOrganization = z.infer<typeof NpcOrganizationSchema>;
export type SpatialPresence = z.infer<typeof SpatialPresenceSchema>;
export type RoutineItem = z.infer<typeof RoutineItemSchema>;
export type NpcData = z.infer<typeof NpcSchema>;

export type CreateNpcInput = z.infer<typeof CreateNpcInputSchema>;
export type UpdateNpcPublicProfileInput = z.infer<typeof UpdateNpcPublicProfileInputSchema>;
export type UpdateNpcStatusInput = z.infer<typeof UpdateNpcStatusInputSchema>;
export type UpdateNpcLocationInput = z.infer<typeof UpdateNpcLocationInputSchema>;
export type UpdateNpcRelationshipInput = z.infer<typeof UpdateNpcRelationshipInputSchema>;
export type UpdateNpcOrganizationInput = z.infer<typeof UpdateNpcOrganizationInputSchema>;
export type AddNpcSecretInput = z.infer<typeof AddNpcSecretInputSchema>;
export type AddMemoryEventInput = z.infer<typeof AddMemoryEventInputSchema>;
export type UpdateSubjectiveThoughtsInput = z.infer<typeof UpdateSubjectiveThoughtsInputSchema>;
export type UpdatePlayerNotesInput = z.infer<typeof UpdatePlayerNotesInputSchema>;

export interface SearchNpcsFilter {
  location_id?: string | undefined;
  role?: string | undefined;
  relationship_type?: string | undefined;
  status?: NpcLifecycleStatus | undefined;
}

export interface PublicIsolatedNpc {
  npc_id: string;
  status: NpcLifecycleStatus;
  public_profile: PublicProfile;
  knowledge: {
    player_notes: PlayerNotes;
    revealed_secrets: NpcSecret[];
  };
  relationships: NpcRelationship[];
  organizations: NpcOrganization[];
  spatial_presence: SpatialPresence;
  created_at?: number | undefined;
  updated_at?: number | undefined;
}
