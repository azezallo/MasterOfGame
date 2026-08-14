import { PlayerStateRepository } from '../repositories/player_state.repository';
import { WorldStateRepository } from '../repositories/world_state.repository';
import { PropertyService } from './property.service';
import { PlayerStateProfile, UpdatePlayerStateInput, SkillEntry } from '../types/player_state.types';
import { UpdatePlayerStateInputSchema } from '../schemas/player_state.schema';

export class PlayerStateService {
  private playerStateRepo: PlayerStateRepository;
  private propertyService?: PropertyService | undefined;
  private worldStateRepo?: WorldStateRepository | undefined;

  constructor(
    playerStateRepo: PlayerStateRepository,
    propertyService?: PropertyService,
    worldStateRepo?: WorldStateRepository
  ) {
    this.playerStateRepo = playerStateRepo;
    this.propertyService = propertyService;
    this.worldStateRepo = worldStateRepo;
  }

  public getPlayerState(sessionId: string): PlayerStateProfile {
    return this.playerStateRepo.getPlayerState(sessionId);
  }

  public updatePlayerState(sessionId: string, input: UpdatePlayerStateInput, playerId: string = 'default_player'): PlayerStateProfile {
    const validatedInput = UpdatePlayerStateInputSchema.parse(input);
    const profile = this.playerStateRepo.getPlayerState(sessionId);

    const gameWorldTime = this.worldStateRepo?.getTimeAndWeather()?.current_date;
    const nowIso = gameWorldTime || new Date().toISOString();

    // 1. Physical States
    if (validatedInput.remove_physical_states && validatedInput.remove_physical_states.length > 0) {
      const toRemove = new Set(validatedInput.remove_physical_states);
      profile.physical_states = profile.physical_states.filter(s => !toRemove.has(s.name));
    }
    if (validatedInput.add_physical_states && validatedInput.add_physical_states.length > 0) {
      for (const name of validatedInput.add_physical_states) {
        profile.physical_states = profile.physical_states.filter(s => s.name !== name);
        profile.physical_states.push({ name, timestamp: nowIso });
      }
    }

    // 2. Body States
    if (validatedInput.remove_body_states && validatedInput.remove_body_states.length > 0) {
      const toRemove = new Set(validatedInput.remove_body_states);
      profile.body_states = profile.body_states.filter(s => !toRemove.has(s.name));
    }
    if (validatedInput.add_body_states && validatedInput.add_body_states.length > 0) {
      for (const name of validatedInput.add_body_states) {
        profile.body_states = profile.body_states.filter(s => s.name !== name);
        profile.body_states.push({ name, timestamp: nowIso });
      }
    }

    // 3. Psychological States
    if (validatedInput.remove_psychological_states && validatedInput.remove_psychological_states.length > 0) {
      const toRemove = new Set(validatedInput.remove_psychological_states);
      profile.psychological_states = profile.psychological_states.filter(s => !toRemove.has(s.name));
    }
    if (validatedInput.add_psychological_states && validatedInput.add_psychological_states.length > 0) {
      for (const name of validatedInput.add_psychological_states) {
        profile.psychological_states = profile.psychological_states.filter(s => s.name !== name);
        profile.psychological_states.push({ name, timestamp: nowIso });
      }
    }

    // 4. Mana Adjustment (Delta or Percent)
    if (!profile.magic_stats) {
      profile.magic_stats = { current_mana: 25, mana_pool: 100, mana_flow: 5, base_regen: 10.0 };
    }
    if (typeof validatedInput.mana_percent === 'number') {
      const factor = 1 + (validatedInput.mana_percent / 100);
      profile.magic_stats.current_mana = Math.max(0, Math.min(profile.magic_stats.mana_pool, Math.round(profile.magic_stats.current_mana * factor)));
    } else if (validatedInput.mana_delta !== undefined) {
      const newMana = profile.magic_stats.current_mana + validatedInput.mana_delta;
      profile.magic_stats.current_mana = Math.max(0, Math.min(profile.magic_stats.mana_pool, newMana));
    }

    // 5. Attributes & Derived Stats
    if (validatedInput.update_attributes) {
      profile.attributes = {
        ...profile.attributes,
        ...validatedInput.update_attributes,
      };
    }
    // Formula: max_carry_weight_kg = 5.0 + strength * 2.0
    const calculatedWeight = 5.0 + profile.attributes.strength * 2.0;
    profile.derived_stats.max_carry_weight_kg = Math.round(calculatedWeight * 100) / 100;

    // 6. Skills (SkillEntry Array or Single Skill Shorthand)
    if (!Array.isArray(profile.skills)) {
      profile.skills = [];
    }

    const setOrUpdateSkill = (name: string, targetValue?: number, delta?: number) => {
      const normalizedName = name.trim();
      const existing = profile.skills.find(s => s.name.toLowerCase() === normalizedName.toLowerCase());
      const currentVal = existing ? existing.value : 0;
      let newVal = currentVal;
      if (typeof targetValue === 'number') {
        newVal = targetValue;
      } else if (typeof delta === 'number') {
        newVal = currentVal + delta;
      }
      newVal = Math.max(0, Math.min(100, newVal));

      if (existing) {
        existing.name = normalizedName;
        existing.value = newVal;
      } else {
        profile.skills.push({ name: normalizedName, value: newVal });
      }
    };

    if (validatedInput.update_skills) {
      if (Array.isArray(validatedInput.update_skills)) {
        for (const skillObj of validatedInput.update_skills) {
          setOrUpdateSkill(skillObj.name, skillObj.value);
        }
      } else if (typeof validatedInput.update_skills === 'object') {
        for (const [sName, val] of Object.entries(validatedInput.update_skills)) {
          setOrUpdateSkill(sName, val as number);
        }
      }
    }

    if (validatedInput.skill_name) {
      setOrUpdateSkill(validatedInput.skill_name, validatedInput.skill_value, validatedInput.skill_delta);
    }

    // Save updated profile
    this.playerStateRepo.savePlayerState(sessionId, profile);

    // Synchronize weight with PropertyService if provided
    if (this.propertyService) {
      const propProfile = this.propertyService.getOwnerProperty('player', playerId);
      this.propertyService.recalculateWeightStats(propProfile, profile.derived_stats.max_carry_weight_kg);
    }

    return profile;
  }
}
