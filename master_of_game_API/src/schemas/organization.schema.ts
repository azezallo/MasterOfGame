import { z } from 'zod';

export const RankDefinitionSchema = z.object({
  rank_id: z.string(),
  rank_name: z.string(),
  superior_id: z.string().nullable().default(null),
  privileges: z.array(z.string()).default([]),
  duties: z.array(z.string()).default([]),
});

export const OrganizationObjectivesSchema = z.object({
  public: z.array(z.string()).default([]),
  secret: z.array(z.string()).default([]),
});

export const OrganizationResourcesSchema = z.object({
  wealth_level: z.string().default('medium'),
  manpower_level: z.string().default('medium'),
  influence: z.string().default('medium'),
});

export const OrganizationSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name is required'),
  type: z.string().min(1, 'Type is required'),
  is_secret: z.boolean().default(false),
  is_known_to_player: z.boolean().default(false),
  description: z.string().default(''),
  hierarchy: z.array(RankDefinitionSchema).default([]),
  objectives: OrganizationObjectivesSchema.default({ public: [], secret: [] }),
  resources: OrganizationResourcesSchema.default({
    wealth_level: 'medium',
    manpower_level: 'medium',
    influence: 'medium',
  }),
  created_at: z.number().optional(),
  updated_at: z.number().optional(),
});

export const AffiliationInteractionSchema = z.object({
  timestamp: z.string(),
  description: z.string(),
  reputation_change: z.number(),
});

export const PlayerOrganizationAffiliationSchema = z.object({
  organization_id: z.string(),
  rank_id: z.string().nullable().default(null),
  reputation: z.number().min(-100).max(100).default(0),
  interactions: z.array(AffiliationInteractionSchema).default([]),
  player_notes: z.string().optional().default(''),
  created_at: z.number().optional(),
  updated_at: z.number().optional(),
});

export const UpdatePlayerAffiliationInputSchema = z.object({
  rank_id: z.string().nullable().optional(),
  reputation_delta: z.number().optional(),
  interaction_event: z
    .object({
      description: z.string(),
      reputation_change: z.number(),
    })
    .optional(),
});

export const UpdateOrganizationStatusInputSchema = z.object({
  is_known_to_player: z.boolean().optional(),
  objectives_override: z
    .object({
      public: z.array(z.string()).optional(),
      secret: z.array(z.string()).optional(),
    })
    .optional(),
  resources_change: z
    .object({
      wealth_level: z.string().optional(),
      manpower_level: z.string().optional(),
      influence: z.string().optional(),
    })
    .optional(),
});

export const CreateOrganizationInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  type: z.string().min(1, 'Type is required'),
  is_secret: z.boolean().default(false),
  description: z.string().default(''),
  objectives: OrganizationObjectivesSchema.optional(),
  hierarchy: z.array(RankDefinitionSchema).optional(),
  resources: OrganizationResourcesSchema.optional(),
  is_known_to_player: z.boolean().optional().default(false),
});

export const UpdateOrganizationNotesInputSchema = z
  .object({
    notes: z.string().optional(),
    content: z.string().optional(),
  })
  .refine((data) => data.notes !== undefined || data.content !== undefined, {
    message: "Either 'notes' or 'content' field must be provided",
  });

export const GetOrganizationsListFilterSchema = z.object({
  type: z.string().optional(),
  is_secret: z.boolean().optional(),
});

export const GetOrganizationMembersFilterSchema = z.object({
  rank_id: z.string().optional(),
  location_id: z.string().optional(),
});
