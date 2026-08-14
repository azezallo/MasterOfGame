import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { DatabaseRepository } from '../persistence/database_repository';
import { PlayerStateService } from '../services/player_state.service';
import { PropertyService } from '../services/property.service';
import { CONFIG } from '../config';

describe('PlayerStateService Integration', () => {
  let repo: DatabaseRepository;
  let playerStateService: PlayerStateService;
  let propertyService: PropertyService;

  const testPlayerId = 'test_player';
  const testSessionId = 'test_session_ps';
  const testDbPath = path.resolve(CONFIG.SAVES_DIR, testPlayerId, `${testSessionId}.db`);

  beforeEach(async () => {
    const saveDir = path.resolve(CONFIG.SAVES_DIR, testPlayerId);
    if (!fs.existsSync(saveDir)) {
      fs.mkdirSync(saveDir, { recursive: true });
    }
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    repo = new DatabaseRepository();
    await repo.initializeDB(testPlayerId, testSessionId);
    propertyService = new PropertyService(
      repo.getPropertyRepository(),
      repo.getItemRepository(),
      repo.getPlayerStateRepository()
    );
    playerStateService = new PlayerStateService(
      repo.getPlayerStateRepository(),
      propertyService,
      repo.getWorldStateRepository()
    );
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
    expect(state.magic_stats.current_mana).toBe(100);
    expect(state.magic_stats.mana_pool).toBe(100);
    const fireMagic = state.skills.find(s => s.name === 'Магія вогню');
    expect(fireMagic?.value).toBe(50);
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
      update_skills: [
        { name: 'Магія вогню', value: 55 },
        { name: 'Фехтування мечем', value: 35 },
      ],
    });

    const fire = updated.skills.find(s => s.name === 'Магія вогню');
    const sword = updated.skills.find(s => s.name === 'Фехтування мечем');
    const stealth = updated.skills.find(s => s.name === 'Приховане пересування');
    expect(fire?.value).toBe(55);
    expect(sword?.value).toBe(35);
    expect(stealth?.value).toBe(15);
  });

  it('should update skill via single skill shorthand (skill_name and skill_value / skill_delta)', () => {
    const updated = playerStateService.updatePlayerState('test_session_ps', {
      skill_name: 'Маніпуляція енергією',
      skill_value: 45,
    });
    const energy = updated.skills.find(s => s.name === 'Маніпуляція енергією');
    expect(energy?.value).toBe(45);

    const boosted = playerStateService.updatePlayerState('test_session_ps', {
      skill_name: 'Маніпуляція енергією',
      skill_delta: 15,
    });
    const boostedEnergy = boosted.skills.find(s => s.name === 'Маніпуляція енергією');
    expect(boostedEnergy?.value).toBe(60);
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
