import { PlayerStateRepository } from '../repositories/player_state.repository';
import { PropertyService } from './property.service';
import { PlayerStateProfile, UpdatePlayerStateInput } from '../types/player_state.types';
import { UpdatePlayerStateInputSchema } from '../schemas/player_state.schema';

export class PlayerStateService {
  private playerStateRepo: PlayerStateRepository;
  private propertyService?: PropertyService | undefined;

  constructor(playerStateRepo: PlayerStateRepository, propertyService?: PropertyService) {
    this.playerStateRepo = playerStateRepo;
    this.propertyService = propertyService;
  }

  public getPlayerState(sessionId: string): PlayerStateProfile {
    return this.playerStateRepo.getPlayerState(sessionId);
  }

  public updatePlayerState(sessionId: string, input: UpdatePlayerStateInput, playerId: string = 'default_player'): PlayerStateProfile {
    const validatedInput = UpdatePlayerStateInputSchema.parse(input);
    const profile = this.playerStateRepo.getPlayerState(sessionId);
    const nowIso = new Date().toISOString();

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

    // 4. Mana Delta
    if (validatedInput.mana_delta !== undefined) {
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

    // 6. Skills
    if (validatedInput.update_skills) {
      profile.skills = {
        ...profile.skills,
        ...validatedInput.update_skills,
      };
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
