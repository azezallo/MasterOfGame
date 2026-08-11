import { z } from 'zod';

// 1. Lifecycle Status & Context Mode
export const NpcLifecycleStatusEnum = z.enum([
  'alive',
  'dead',
  'coma',
  'missing',
  'captured',
  'archived',
]);
export type NpcLifecycleStatus = z.infer<typeof NpcLifecycleStatusEnum>;

export const NpcContextModeEnum = z.enum([
  'DIALOG',
  'ACTION',
  'INVESTIGATION',
]);
export type NpcContextMode = z.infer<typeof NpcContextModeEnum>;

// 2. Public Profile
export const PublicProfileSchema = z.object({
  name: z.string().min(1, 'NPC name is required'),
  role: z.string().default(''),
  appearance: z.string().default(''),
  public_description: z.string().default(''),
});
export type PublicProfile = z.infer<typeof PublicProfileSchema>;

// 3. Private Profile
export const TraitsSchema = z.object({
  moral_alignment: z.string().default(''),
  resilience: z.string().default(''),
  social_style: z.string().default(''),
});

export const DriversSchema = z.object({
  primary_goals: z.array(z.string()).default([]),
  critical_fears: z.array(z.string()).default([]),
});

export const AttachmentsSchema = z.object({
  family_loyalty: z.string().default(''),
  organization_loyalty: z.string().default(''),
  core_values: z.string().default(''),
});

export const CurrentStatusSchema = z.object({
  mood: z.string().default('calm'),
  relationship_to_player: z.string().default('neutral'),
  current_goal: z.string().default(''),
});

export const PrivateProfileSchema = z.object({
  traits: TraitsSchema.default({ moral_alignment: '', resilience: '', social_style: '' }),
  drivers: DriversSchema.default({ primary_goals: [], critical_fears: [] }),
  attachments: AttachmentsSchema.default({ family_loyalty: '', organization_loyalty: '', core_values: '' }),
  current_status: CurrentStatusSchema.default({ mood: 'calm', relationship_to_player: 'neutral', current_goal: '' }),
});
export type PrivateProfile = z.infer<typeof PrivateProfileSchema>;

// 4. Knowledge & Memory
export const DynamicUpdateSchema = z.object({
  timestamp: z.number(),
  trigger: z.string(),
  update_text: z.string(),
});

export const WorldPerceptionSchema = z.object({
  description: z.string().default(''),
  dynamic_updates: z.array(DynamicUpdateSchema).default([]),
});

export const SecretDiscoveryStatusEnum = z.enum([
  'hidden',
  'discovered_by_player',
  'revealed_to_all',
]);
export type SecretDiscoveryStatus = z.infer<typeof SecretDiscoveryStatusEnum>;

export const NpcSecretSchema = z.object({
  secret_id: z.string(),
  description: z.string(),
  source: z.string().default('witnessed'),
  discovery_status: SecretDiscoveryStatusEnum.default('hidden'),
});
export type NpcSecret = z.infer<typeof NpcSecretSchema>;

export const MemoryEventSchema = z.object({
  timestamp: z.number(),
  event_description: z.string(),
  source_type: z.string().default('direct_interaction'),
});
export type NpcMemoryEvent = z.infer<typeof MemoryEventSchema>;

export const HiddenMemorySchema = z.object({
  events: z.array(MemoryEventSchema).default([]),
  memory_summary: z.string().default(''),
  secrets: z.array(NpcSecretSchema).default([]),
});

export const SubjectiveThoughtsSchema = z.object({
  player_evaluation: z.string().default(''),
  topics_discussed: z.array(z.string()).default([]),
  mood_impact: z.string().default(''),
});

export const PlayerNotesSchema = z.object({
  content: z.string().default(''),
  last_updated: z.number().default(0),
});
export type PlayerNotes = z.infer<typeof PlayerNotesSchema>;

export const KnowledgeSchema = z.object({
  world_perception: WorldPerceptionSchema.default({ description: '', dynamic_updates: [] }),
  hidden_memory: HiddenMemorySchema.default({ events: [], memory_summary: '', secrets: [] }),
  subjective_thoughts: SubjectiveThoughtsSchema.default({ player_evaluation: '', topics_discussed: [], mood_impact: '' }),
  player_notes: PlayerNotesSchema.default({ content: '', last_updated: 0 }),
});
export type Knowledge = z.infer<typeof KnowledgeSchema>;

// 5. Social & Organization Relationships
export const NpcRelationshipSchema = z.object({
  target_npc_id: z.string(),
  relationship_type: z.string(),
  strength: z.number().min(-1.0).max(1.0).default(0),
  summary: z.string().default(''),
  last_updated: z.number().default(() => Math.floor(Date.now() / 1000)),
});
export type NpcRelationship = z.infer<typeof NpcRelationshipSchema>;

export const OrganizationInteractionSchema = z.object({
  timestamp: z.string(),
  description: z.string(),
  reputation_change: z.number(),
});

export const NpcOrganizationSchema = z.object({
  organization_id: z.string(),
  rank_id: z.string().nullable().default(null),
  reputation: z.number().min(-100).max(100).default(0),
  interactions: z.array(OrganizationInteractionSchema).default([]),
});
export type NpcOrganization = z.infer<typeof NpcOrganizationSchema>;

// 6. Spatial Presence
export const RoutineItemSchema = z.object({
  time_window: z.string(),
  location_id: z.string(),
  activity: z.string(),
});
export type RoutineItem = z.infer<typeof RoutineItemSchema>;

export const SpatialPresenceSchema = z.object({
  current_location_id: z.string().default(''),
  default_routine: z.array(RoutineItemSchema).default([]),
  override_event: z.string().nullable().default(null),
});
export type SpatialPresence = z.infer<typeof SpatialPresenceSchema>;

// 7. Complete NPC Schema
export const NpcSchema = z.object({
  npc_id: z.string(),
  status: NpcLifecycleStatusEnum.default('alive'),
  public_profile: PublicProfileSchema,
  private_profile: PrivateProfileSchema.default({
    traits: { moral_alignment: '', resilience: '', social_style: '' },
    drivers: { primary_goals: [], critical_fears: [] },
    attachments: { family_loyalty: '', organization_loyalty: '', core_values: '' },
    current_status: { mood: 'calm', relationship_to_player: 'neutral', current_goal: '' },
  }),
  knowledge: KnowledgeSchema.default({
    world_perception: { description: '', dynamic_updates: [] },
    hidden_memory: { events: [], memory_summary: '', secrets: [] },
    subjective_thoughts: { player_evaluation: '', topics_discussed: [], mood_impact: '' },
    player_notes: { content: '', last_updated: 0 },
  }),
  relationships: z.array(NpcRelationshipSchema).default([]),
  organizations: z.array(NpcOrganizationSchema).default([]),
  spatial_presence: SpatialPresenceSchema.default({
    current_location_id: '',
    default_routine: [],
    override_event: null,
  }),
  created_at: z.number().optional(),
  updated_at: z.number().optional(),
});
export type NpcData = z.infer<typeof NpcSchema>;

// 8. Tool Input Schemas
export const CreateNpcInputSchema = z.object({
  npc_id: z.string().optional(),
  public_profile: PublicProfileSchema,
  private_profile: PrivateProfileSchema.partial().optional(),
  location_id: z.string().optional(),
  template_id: z.string().optional(),
  status: NpcLifecycleStatusEnum.optional(),
});

export const UpdateNpcPublicProfileInputSchema = z.object({
  name: z.string().optional(),
  role: z.string().optional(),
  appearance: z.string().optional(),
  public_description: z.string().optional(),
});

export const UpdateNpcStatusInputSchema = z.object({
  mood: z.string().optional(),
  relationship_to_player: z.string().optional(),
  current_goal: z.string().optional(),
});

export const UpdateNpcLocationInputSchema = z.object({
  current_location_id: z.string().optional(),
  override_event: z.string().nullable().optional(),
  default_routine: z.array(RoutineItemSchema).optional(),
});

export const UpdateNpcRelationshipInputSchema = z.object({
  target_id: z.string(),
  relationship_type: z.string().optional(),
  strength_delta: z.number().optional(),
  summary: z.string().optional(),
});

export const UpdateNpcOrganizationInputSchema = z.object({
  organization_id: z.string(),
  rank_id: z.string().nullable().optional(),
  reputation_delta: z.number().optional(),
  interaction_event: z.object({
    description: z.string(),
    reputation_change: z.number(),
  }).optional(),
});

export const AddNpcSecretInputSchema = z.object({
  secret_id: z.string(),
  description: z.string(),
  source: z.string().optional(),
  discovery_status: SecretDiscoveryStatusEnum.optional(),
});

export const AddMemoryEventInputSchema = z.object({
  event_description: z.string(),
  source_type: z.string().optional(),
});

export const UpdateSubjectiveThoughtsInputSchema = z.object({
  player_evaluation: z.string().optional(),
  topics_discussed_add: z.array(z.string()).optional(),
  mood_impact: z.string().optional(),
});

export const UpdatePlayerNotesInputSchema = z.object({
  content: z.string(),
});
