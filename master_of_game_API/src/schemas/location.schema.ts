import { z } from 'zod';

export const CoordinatesSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number()
});

export const LocationTypeSchema = z.enum([
  'region',
  'settlement',
  'building',
  'room',
  'dungeon_cell',
  'wilderness',
  'waterway'
]);

export const DiscoveryStatusSchema = z.enum([
  'undiscovered',
  'discovered',
  'visited'
]);

export const AccessStatusSchema = z.enum([
  'open',
  'locked',
  'hidden',
  'blocked',
  'danger_zone'
]);

export const TransitionTypeSchema = z.enum([
  'grid_neighbor',
  'interior_stairs',
  'custom_secret',
  'portal',
  'road',
  'waterway'
]);

export const TransitionDiscoveryStatusSchema = z.enum([
  'visible',
  'hidden',
  'discovered'
]);

export const TransitionAccessStatusSchema = z.enum([
  'open',
  'locked',
  'blocked',
  'conditional'
]);

export const LockDetailsSchema = z.object({
  key_id: z.string().nullable(),
  lockpick_dc: z.number()
});

export const HazardLevelSchema = z.enum(['none', 'low', 'medium', 'high']);

export const TravelPropertiesSchema = z.object({
  time_minutes: z.number(),
  hazard_level: HazardLevelSchema
});

export const TransitionSchema = z.object({
  transition_id: z.string(),
  direction_label: z.string(),
  target_location_id: z.string(),
  transition_type: TransitionTypeSchema,
  discovery_status: TransitionDiscoveryStatusSchema,
  access_status: TransitionAccessStatusSchema,
  lock_details: LockDetailsSchema.optional().nullable(),
  travel_properties: TravelPropertiesSchema.optional().nullable(),
  secret_id: z.string().nullable().optional()
});

export const EnvironmentalStateSchema = z.object({
  mana_density: z.number().min(0).max(100),
  lighting: z.enum(['bright', 'dim', 'dark', 'magical_darkness']),
  weather: z.string().nullable(),
  active_hazards: z.array(z.string())
});

export const StateModificationSchema = z.object({
  modification_id: z.string(),
  timestamp: z.string(),
  type: z.enum(['structural_damage', 'environmental_change', 'entity_left', 'inscription']),
  description: z.string()
});

export const SecretSchema = z.object({
  secret_id: z.string(),
  description: z.string(),
  discovery_status: z.enum(['hidden', 'discovered_by_player'])
});

export const ConnectedEntitiesSchema = z.object({
  associated_npc_ids: z.array(z.string()),
  present_item_ids: z.array(z.string())
});

export const LocationSchema = z.object({
  location_id: z.string(),
  parent_location_id: z.string().nullable(),
  matrix_coordinates: CoordinatesSchema.nullable().optional(),
  location_type: LocationTypeSchema,
  name: z.string(),
  public_description: z.string(),
  discovery_status: DiscoveryStatusSchema,
  access_status: AccessStatusSchema,
  settlement_blueprint: z.any().nullable().optional(),
  environmental_state: EnvironmentalStateSchema,
  state_modifications: z.array(StateModificationSchema).default([]),
  transitions: z.array(TransitionSchema).default([]),
  secrets: z.array(SecretSchema).default([]),
  connected_entities: ConnectedEntitiesSchema
});
