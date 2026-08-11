import { z } from 'zod';

export const MagicDomainSchema = z.enum([
  'energy',
  'matter',
  'bio',
  'mind',
  'space',
  'time',
  'energy_manipulation',
  'matter_manipulation',
  'bio_manipulation',
  'mind_manipulation',
  'space_manipulation',
  'time_manipulation'
]);

export const SpellCostInputSchema = z.object({
  domain: MagicDomainSchema,
  base_cost: z.number().nonnegative('Base cost must be non-negative'),
  manifestation_range_m: z.number().nonnegative().optional().default(0),
  targets_life_aura: z.boolean().optional().default(false),
  life_aura_resistance_cost: z.number().nonnegative().optional(),
  caster_skill_level: z.number().min(0).max(100).optional().default(0),
  caster_mana_flow: z.number().nonnegative().optional()
});

export const ManaRegenCalcInputSchema = z.object({
  hours: z.number().nonnegative('Hours must be non-negative'),
  location_density: z.number().min(0).max(100).optional(),
  base_regen: z.number().nonnegative().optional(),
  current_mana: z.number().nonnegative().optional(),
  mana_pool: z.number().nonnegative().optional()
});

export const StabilityBonusSchema = z.union([
  z.object({
    target: z.string().default('all'),
    amount: z.number()
  }),
  z.number().transform((val) => ({
    target: 'all',
    amount: val
  }))
]);

export const MagicItemPropertiesSchema = z.object({
  mana_restore: z.number().nonnegative().optional(),
  mana_capacity: z.number().nonnegative().optional(),
  mana_current: z.number().nonnegative().optional(),
  mana_cost_per_use: z.number().nonnegative().optional(),
  mana_regen: z.number().nonnegative().optional(),
  requires_mage: z.boolean().optional(),
  stability_bonus: StabilityBonusSchema.optional(),
  spell_matrix: z.string().optional(),
  concentration_required: z.boolean().optional()
});
