import { PlayerStateRepository } from '../repositories/player_state.repository';
import { LocationRepository } from '../repositories/location.repository';
import {
  MagicDomain,
  SpellCostInput,
  SpellCostResult,
  ManaRegenCalcInput,
  ManaRegenCalcResult,
  MagicItemProperties,
  MagicItemEvaluationResult
} from '../types/magic.types';
import {
  SpellCostInputSchema,
  ManaRegenCalcInputSchema,
  MagicItemPropertiesSchema
} from '../schemas/magic.schema';

export const DOMAIN_MULTIPLIERS: Record<MagicDomain, number> = {
  energy: 1,
  energy_manipulation: 1,
  matter: 2,
  matter_manipulation: 2,
  bio: 4,
  bio_manipulation: 4,
  mind: 8,
  mind_manipulation: 8,
  space: 16,
  space_manipulation: 16,
  time: 32,
  time_manipulation: 32
};

export class MagicService {
  constructor(
    private playerStateRepo?: PlayerStateRepository,
    private locationRepo?: LocationRepository
  ) {}

  public calculateManaRegenMultiplier(density: number): number {
    if (density <= 0) return 0.0;
    if (density >= 100) return 100.0;
    return density / (100.0 - density);
  }

  public recalculatePassiveManaRegen(
    sessionId: string,
    hours: number,
    locationDensity?: number
  ): ManaRegenCalcResult {
    if (!this.playerStateRepo) {
      throw new Error('PlayerStateRepository is required for recalculatePassiveManaRegen');
    }

    const playerProfile = this.playerStateRepo.getPlayerState(sessionId);
    const magicStats = playerProfile.magic_stats;

    let density = locationDensity;
    if (density === undefined && this.locationRepo) {
      const locations = this.locationRepo.findByParentId(null);
      if (locations.length > 0 && locations[0]?.environmental_state?.mana_density !== undefined) {
        density = locations[0].environmental_state.mana_density;
      }
    }
    if (density === undefined) {
      density = 50;
    }

    const multiplier = this.calculateManaRegenMultiplier(density);
    const baseRegen = magicStats.base_regen ?? 10.0;
    const currentMana = magicStats.current_mana;
    const maxMana = magicStats.mana_pool;

    let restoredMana = 0;
    let newMana = currentMana;
    let isInstant = false;

    if (density >= 100) {
      isInstant = true;
      restoredMana = Math.max(0, maxMana - currentMana);
      newMana = maxMana;
    } else if (density <= 0) {
      isInstant = false;
      restoredMana = 0;
      newMana = currentMana;
    } else {
      isInstant = false;
      restoredMana = hours * baseRegen * multiplier;
      newMana = Math.min(maxMana, currentMana + restoredMana);
    }

    magicStats.current_mana = Math.round(newMana * 100) / 100;
    this.playerStateRepo.savePlayerState(sessionId, playerProfile);

    return {
      multiplier: Math.round(multiplier * 1000) / 1000,
      restored_mana: Math.round(restoredMana * 100) / 100,
      new_mana: magicStats.current_mana,
      max_mana: maxMana,
      is_instant: isInstant
    };
  }

  public calculateSpellCost(input: SpellCostInput): SpellCostResult {
    const validated = SpellCostInputSchema.parse(input);
    const domain = validated.domain as MagicDomain;
    const baseCost = validated.base_cost;
    const rangeM = validated.manifestation_range_m ?? 0;
    const targetsLifeAura = validated.targets_life_aura ?? false;
    const casterSkill = validated.caster_skill_level ?? 0;
    const casterFlow = validated.caster_mana_flow ?? 0;

    const domainMultiplier = DOMAIN_MULTIPLIERS[domain] ?? 1;
    const rangeMultiplier = Math.pow(2, Math.floor(rangeM / 5));

    const lifeAuraPenetrated = targetsLifeAura ? casterSkill >= 80 : true;
    const lifeAuraCost = targetsLifeAura ? (validated.life_aura_resistance_cost ?? 3000) : 0;

    const domainCost = baseCost * domainMultiplier * rangeMultiplier;
    const totalManaCost = domainCost + lifeAuraCost;

    let castTimeMinutes = 0;
    let canCastInstantly = true;
    if (casterFlow > 0) {
      if (totalManaCost > casterFlow) {
        canCastInstantly = false;
        castTimeMinutes = Math.ceil(totalManaCost / casterFlow);
      }
    }

    let difficultyThreshold = 15;
    if (totalManaCost > 1000) {
      difficultyThreshold = 85;
    } else if (totalManaCost > 200) {
      difficultyThreshold = 70;
    } else if (totalManaCost > 50) {
      difficultyThreshold = 40;
    }

    let instabilityRisk = 0;
    if (!lifeAuraPenetrated) {
      instabilityRisk = 100;
    } else {
      const skillDiff = difficultyThreshold - casterSkill;
      if (skillDiff > 0) {
        instabilityRisk = Math.min(100, Math.round(skillDiff * 1.5));
      }
    }

    return {
      domain,
      base_cost: baseCost,
      domain_multiplier: domainMultiplier,
      range_multiplier: rangeMultiplier,
      manifestation_range_m: rangeM,
      life_aura_cost: lifeAuraCost,
      life_aura_penetrated: lifeAuraPenetrated,
      total_mana_cost: totalManaCost,
      cast_time_minutes: castTimeMinutes,
      can_cast_instantly: canCastInstantly,
      instability_risk: instabilityRisk
    };
  }

  public evaluateMagicItemProperties(itemProps: any): MagicItemEvaluationResult {
    const parseResult = MagicItemPropertiesSchema.safeParse(itemProps);

    if (!parseResult.success) {
      return {
        is_valid: false,
        item_type: 'unknown',
        summary: 'Invalid magic item properties schema',
        details: {}
      };
    }

    const props = parseResult.data;
    const details: MagicItemEvaluationResult['details'] = {};

    if (props.mana_restore !== undefined) details.mana_restore = props.mana_restore;
    if (props.mana_capacity !== undefined) details.mana_capacity = props.mana_capacity;
    if (props.mana_current !== undefined) details.mana_current = props.mana_current;
    if (props.mana_cost_per_use !== undefined) details.mana_cost_per_use = props.mana_cost_per_use;
    if (props.mana_regen !== undefined) details.mana_regen = props.mana_regen;
    if (props.requires_mage !== undefined) details.requires_mage = props.requires_mage;
    if (props.stability_bonus !== undefined) details.stability_bonus = props.stability_bonus;
    if (props.spell_matrix !== undefined) details.spell_matrix = props.spell_matrix;
    if (props.concentration_required !== undefined) details.concentration_required = props.concentration_required;

    let itemType: MagicItemEvaluationResult['item_type'] = 'unknown';
    let summary = 'Generic magic item';

    if (props.spell_matrix && props.mana_capacity !== undefined) {
      itemType = 'device';
      summary = `Autonomous Magic Device (${props.spell_matrix}, capacity: ${props.mana_capacity})`;
    } else if (props.spell_matrix) {
      itemType = 'artifact';
      summary = `Programmed Magic Artifact (${props.spell_matrix})`;
    } else if (props.stability_bonus) {
      itemType = 'focus';
      summary = `Focus Item (stability bonus target: ${props.stability_bonus.target}, +${props.stability_bonus.amount}%)`;
    } else if (props.mana_capacity !== undefined) {
      itemType = 'crystal';
      summary = `Mana Storage Crystal (capacity: ${props.mana_capacity}, current: ${props.mana_current ?? 0})`;
    } else if (props.mana_restore !== undefined) {
      itemType = 'potion';
      summary = `Mana Potion/Consumable (restores ${props.mana_restore} mana)`;
    }

    return {
      is_valid: true,
      item_type: itemType,
      summary,
      details
    };
  }
}
