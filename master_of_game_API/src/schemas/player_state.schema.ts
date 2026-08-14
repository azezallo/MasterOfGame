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

export const SkillEntrySchema = z.object({
  name: z.string().min(1),
  value: z.number().int().min(0).max(100),
});
export type SkillEntry = z.infer<typeof SkillEntrySchema>;

const LEGACY_SKILL_NAMES_MAP: Record<string, string> = {
  fire_magic: 'Магія вогню',
  sword_fighting: 'Фехтування мечем',
  stealth: 'Приховане пересування',
  energy_manipulation: 'Маніпуляція енергією',
  spear_mastery: 'Володіння пікою',
};

// Pre-transform to handle legacy { "fire_magic": 50 } or array of objects [{ name: "Магія вогню", value: 50 }]
export const PlayerSkillsSchema = z.preprocess((val) => {
  if (Array.isArray(val)) {
    return val.map((item) => {
      if (typeof item === 'object' && item !== null && 'name' in item) {
        return {
          name: LEGACY_SKILL_NAMES_MAP[item.name] || item.name,
          value: typeof item.value === 'number' ? item.value : 0,
        };
      }
      return item;
    });
  }
  if (typeof val === 'object' && val !== null) {
    return Object.entries(val).map(([k, v]) => ({
      name: LEGACY_SKILL_NAMES_MAP[k] || k,
      value: typeof v === 'number' ? v : 0,
    }));
  }
  return [];
}, z.array(SkillEntrySchema));

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
  mana_percent: z.number().optional(),
  update_attributes: PlayerAttributesSchema.partial().optional(),
  update_skills: z.union([
    z.array(SkillEntrySchema),
    z.record(z.string(), z.number().int().min(0).max(100)),
  ]).optional(),
  skill_name: z.string().optional(),
  skill_value: z.number().int().min(0).max(100).optional(),
  skill_delta: z.number().int().optional(),
  update_magic_stats: MagicStatsSchema.partial().optional(),
});
