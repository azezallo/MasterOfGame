import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { DatabaseRepository } from '../persistence/database_repository';
import { PlayerStateService } from '../services/player_state.service';
import { PropertyService } from '../services/property.service';

describe('PlayerState Backend Integration with DatabaseRepository', () => {
  let repo: DatabaseRepository;
  let propertyService: PropertyService;
  let playerStateService: PlayerStateService;
  const testDbPath = path.resolve(__dirname, '../../saves/test_player/test_session_ps.db');

  beforeEach(async () => {
    repo = new DatabaseRepository();
    await repo.initializeDB('test_player', 'test_session_ps');

    const playerStateRepo = repo.getPlayerStateRepository();
    const propertyRepo = repo.getPropertyRepository();
    const itemRepo = repo.getItemRepository();
    propertyService = new PropertyService(propertyRepo, itemRepo, playerStateRepo);
    playerStateService = new PlayerStateService(playerStateRepo, propertyService);
  });

  afterEach(() => {
    repo.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  it('should retrieve default player state when initialized via DatabaseRepository', () => {
    const state = playerStateService.getPlayerState('test_session_ps');

    expect(state.attributes.strength).toBe(25);
    expect(state.derived_stats.max_carry_weight_kg).toBe(55.0);
    expect(state.magic_stats.current_mana).toBe(25);
    expect(state.magic_stats.mana_pool).toBe(100);
    expect(state.skills.fire_magic).toBe(50);
  });

  it('should update qualitative states with ISO timestamps', () => {
    const updated = playerStateService.updatePlayerState('test_session_ps', {
      add_physical_states: ['light_wound', 'bleeding'],
      add_body_states: ['fatigue'],
      add_psychological_states: ['stress'],
    });

    expect(updated.physical_states.length).toBe(2);
    expect(updated.physical_states.map(s => s.name)).toEqual(['light_wound', 'bleeding']);
    expect(updated.physical_states[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    expect(updated.body_states.length).toBe(1);
    expect(updated.body_states[0].name).toBe('fatigue');

    expect(updated.psychological_states.length).toBe(1);
    expect(updated.psychological_states[0].name).toBe('stress');

    // Test removing state
    const afterRemoval = playerStateService.updatePlayerState('test_session_ps', {
      remove_physical_states: ['bleeding'],
    });

    expect(afterRemoval.physical_states.length).toBe(1);
    expect(afterRemoval.physical_states[0].name).toBe('light_wound');
  });

  it('should clamp current_mana within [0, mana_pool]', () => {
    const addedMana = playerStateService.updatePlayerState('test_session_ps', {
      mana_delta: 200,
    });
    expect(addedMana.magic_stats.current_mana).toBe(100);

    const drainedMana = playerStateService.updatePlayerState('test_session_ps', {
      mana_delta: -150,
    });
    expect(drainedMana.magic_stats.current_mana).toBe(0);
  });

  it('should update strength and recalculate max_carry_weight_kg (5.0 + strength * 2.0)', () => {
    const updated = playerStateService.updatePlayerState('test_session_ps', {
      update_attributes: { strength: 30 },
    }, 'test_player');

    expect(updated.attributes.strength).toBe(30);
    expect(updated.derived_stats.max_carry_weight_kg).toBe(65.0); // 5.0 + 30 * 2.0
  });

  it('should update skills correctly', () => {
    const updated = playerStateService.updatePlayerState('test_session_ps', {
      update_skills: { fire_magic: 55, sword_fighting: 35 },
    });

    expect(updated.skills.fire_magic).toBe(55);
    expect(updated.skills.sword_fighting).toBe(35);
    expect(updated.skills.stealth).toBe(15);
  });

  it('should synchronize max_carry_weight_kg with PropertyService', () => {
    const sessionId = 'test_session_ps';
    const playerId = 'test_player';
    playerStateService.updatePlayerState(sessionId, {
      update_attributes: { strength: 35 },
    }, playerId);

    const propProfile = propertyService.getOwnerProperty('player', playerId);
    expect(propProfile.pocket_inventory.weight_stats.max_carry_weight_kg).toBe(75.0); // 5.0 + 35 * 2.0
  });
});
