export type MagicDomain =
  | 'energy'
  | 'matter'
  | 'bio'
  | 'mind'
  | 'space'
  | 'time'
  | 'energy_manipulation'
  | 'matter_manipulation'
  | 'bio_manipulation'
  | 'mind_manipulation'
  | 'space_manipulation'
  | 'time_manipulation';

export interface MagicDomainBenchmark {
  domain: MagicDomain;
  multiplier: number;
  description: string;
  examples: Array<{
    action: string;
    base_cost: number;
  }>;
}

export interface SpellCostInput {
  domain: MagicDomain;
  base_cost: number;
  manifestation_range_m?: number;
  targets_life_aura?: boolean;
  life_aura_resistance_cost?: number;
  caster_skill_level?: number;
  caster_mana_flow?: number;
}

export interface SpellCostResult {
  domain: MagicDomain;
  base_cost: number;
  domain_multiplier: number;
  range_multiplier: number;
  manifestation_range_m: number;
  life_aura_cost: number;
  life_aura_penetrated: boolean;
  total_mana_cost: number;
  cast_time_minutes: number;
  can_cast_instantly: boolean;
  instability_risk: number;
}

export interface ManaRegenCalcInput {
  hours: number;
  location_density?: number;
  base_regen?: number;
  current_mana?: number;
  mana_pool?: number;
}

export interface ManaRegenCalcResult {
  multiplier: number;
  restored_mana: number;
  new_mana: number;
  max_mana: number;
  is_instant: boolean;
}

export interface StabilityBonus {
  target: string;
  amount: number;
}

export interface MagicItemProperties {
  mana_restore?: number;
  mana_capacity?: number;
  mana_current?: number;
  mana_cost_per_use?: number;
  mana_regen?: number;
  requires_mage?: boolean;
  stability_bonus?: StabilityBonus | number;
  spell_matrix?: string;
  concentration_required?: boolean;
}

export interface MagicItemEvaluationResult {
  is_valid: boolean;
  item_type: 'potion' | 'crystal' | 'focus' | 'artifact' | 'device' | 'unknown';
  summary: string;
  details: {
    mana_restore?: number;
    mana_capacity?: number;
    mana_current?: number;
    mana_cost_per_use?: number;
    mana_regen?: number;
    requires_mage?: boolean;
    stability_bonus?: StabilityBonus;
    spell_matrix?: string;
    concentration_required?: boolean;
  };
}
