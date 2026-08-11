import { z } from 'zod';

export const StateItemSchema = z.object({
  name: z.string().min(1),
  timestamp: z.string(),
});

export const PlayerAttributesSchema = z.object({
  strength: z.number().int().min(1),
  agility: z.number().int().min(1),
  endurance: z.number().int().min(1),
  perception: z.number().int().min(1),
  willpower: z.number().int().min(1),
});

export const DerivedStatsSchema = z.object({
  max_carry_weight_kg: z.number().nonnegative(),
});

export const MagicStatsSchema = z.object({
  mana_pool: z.number().nonnegative(),
  current_mana: z.number().nonnegative(),
  mana_flow: z.number().nonnegative(),
  base_regen: z.number().nonnegative().optional().default(10.0),
});

export const PlayerSkillsSchema = z.record(z.string(), z.number().int().min(0).max(100));

export const PlayerStateProfileSchema = z.object({
  physical_states: z.array(StateItemSchema),
  body_states: z.array(StateItemSchema),
  psychological_states: z.array(StateItemSchema),
  attributes: PlayerAttributesSchema,
  derived_stats: DerivedStatsSchema,
  magic_stats: MagicStatsSchema,
  skills: PlayerSkillsSchema,
});

export const UpdatePlayerStateInputSchema = z.object({
  add_physical_states: z.array(z.string()).optional(),
  remove_physical_states: z.array(z.string()).optional(),
  add_body_states: z.array(z.string()).optional(),
  remove_body_states: z.array(z.string()).optional(),
  add_psychological_states: z.array(z.string()).optional(),
  remove_psychological_states: z.array(z.string()).optional(),
  mana_delta: z.number().int().optional(),
  update_attributes: PlayerAttributesSchema.partial().optional(),
  update_skills: z.record(z.string(), z.number().int().min(0).max(100)).optional(),
});
