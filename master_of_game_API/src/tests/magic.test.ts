import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MagicService, DOMAIN_MULTIPLIERS } from '../services/magic.service';
import { PersistenceService } from '../persistence/persistence_service';
import { CONFIG } from '../config';
import fs from 'fs';
import path from 'path';
import { logger } from '../logger';

const TEST_SUBDIR = 'magic_test';
const TEST_SAVES_DIR = path.resolve(CONFIG.SAVES_DIR, TEST_SUBDIR);

describe('F015 Magic System Unit & Integration Tests', () => {
  let magicService: MagicService;
  let persistence: PersistenceService;
  let playerId = 'test_magic_player';
  let sessionId = 'test_magic_session';

  beforeAll(async () => {
    if (!fs.existsSync(TEST_SAVES_DIR)) {
      fs.mkdirSync(TEST_SAVES_DIR, { recursive: true });
    }
    (CONFIG as any).SAVES_DIR = TEST_SAVES_DIR;

    persistence = new PersistenceService();
    sessionId = await persistence.createSession(playerId, 'Magic Test Game', 'Mage Hero');
    
    const repo = await persistence.loadSessionRepo(playerId, sessionId);
    if (repo) {
      magicService = new MagicService(
        repo.getPlayerStateRepository(),
        repo.getLocationRepository()
      );
    } else {
      magicService = new MagicService();
    }
  });

  afterAll(async () => {
    PersistenceService.repos.forEach((repo) => repo.close());
    PersistenceService.repos.clear();
    await new Promise((resolve) => setTimeout(resolve, 200));

    if (fs.existsSync(TEST_SAVES_DIR)) {
      try {
        fs.rmSync(TEST_SAVES_DIR, { recursive: true, force: true });
      } catch (e) {
        logger.error(`Failed to cleanup ${TEST_SAVES_DIR}:`, e);
      }
    }
  });

  describe('1. Mana Regeneration Formula (calculateManaRegenMultiplier)', () => {
    it('should return 0.0 for Zero Zone (density <= 0)', () => {
      expect(magicService.calculateManaRegenMultiplier(0)).toBe(0.0);
      expect(magicService.calculateManaRegenMultiplier(-10)).toBe(0.0);
    });

    it('should return 1.0 for Normal Background (density = 50)', () => {
      expect(magicService.calculateManaRegenMultiplier(50)).toBe(1.0);
    });

    it('should return 0.25 for Low Background (density = 20)', () => {
      expect(magicService.calculateManaRegenMultiplier(20)).toBe(0.25);
    });

    it('should return 9.0 for High Background (density = 90)', () => {
      expect(magicService.calculateManaRegenMultiplier(90)).toBe(9.0);
    });

    it('should return 99.0 for Anomaly Epicenter (density = 99)', () => {
      expect(magicService.calculateManaRegenMultiplier(99)).toBe(99.0);
    });

    it('should return 100.0 for Absolute Excess (density >= 100)', () => {
      expect(magicService.calculateManaRegenMultiplier(100)).toBe(100.0);
      expect(magicService.calculateManaRegenMultiplier(150)).toBe(100.0);
    });
  });

  describe('2. Passive Mana Regeneration Recalculation (recalculatePassiveManaRegen)', () => {
    it('should restore mana accurately for density = 50 over 2 hours', () => {
      const result = magicService.recalculatePassiveManaRegen(sessionId, 2, 50);
      expect(result.multiplier).toBe(1.0);
      expect(result.restored_mana).toBe(20);
      expect(result.is_instant).toBe(false);
      expect(result.new_mana).toBeGreaterThan(25);
    });

    it('should restore 0 mana in Zero Zone (density = 0)', () => {
      const resultBefore = magicService.recalculatePassiveManaRegen(sessionId, 5, 0);
      expect(resultBefore.restored_mana).toBe(0);
      expect(resultBefore.is_instant).toBe(false);
    });

    it('should instantly fill mana pool for density = 100', () => {
      const result = magicService.recalculatePassiveManaRegen(sessionId, 1, 100);
      expect(result.is_instant).toBe(true);
      expect(result.new_mana).toBe(result.max_mana);
    });
  });

  describe('3. Spell Cost Calculation (calculateSpellCost)', () => {
    it('should apply correct domain multipliers (Energy x1, Matter x2, Bio x4, Mind x8, Space x16, Time x32)', () => {
      const base = 10;
      expect(magicService.calculateSpellCost({ domain: 'energy', base_cost: base }).total_mana_cost).toBe(10);
      expect(magicService.calculateSpellCost({ domain: 'matter', base_cost: base }).total_mana_cost).toBe(20);
      expect(magicService.calculateSpellCost({ domain: 'bio', base_cost: base }).total_mana_cost).toBe(40);
      expect(magicService.calculateSpellCost({ domain: 'mind', base_cost: base }).total_mana_cost).toBe(80);
      expect(magicService.calculateSpellCost({ domain: 'space', base_cost: base }).total_mana_cost).toBe(160);
      expect(magicService.calculateSpellCost({ domain: 'time', base_cost: base }).total_mana_cost).toBe(320);
    });

    it('should double cost every 5m for manifestation range', () => {
      const baseAtHand = magicService.calculateSpellCost({ domain: 'energy', base_cost: 30, manifestation_range_m: 0 });
      const range5m = magicService.calculateSpellCost({ domain: 'energy', base_cost: 30, manifestation_range_m: 5 });
      const range10m = magicService.calculateSpellCost({ domain: 'energy', base_cost: 30, manifestation_range_m: 10 });
      const range15m = magicService.calculateSpellCost({ domain: 'energy', base_cost: 30, manifestation_range_m: 15 });

      expect(baseAtHand.total_mana_cost).toBe(30);
      expect(range5m.total_mana_cost).toBe(60);
      expect(range10m.total_mana_cost).toBe(120);
      expect(range15m.total_mana_cost).toBe(240);
    });

    it('should check Life Aura resistance and fail if caster skill < 80', () => {
      const resultNovice = magicService.calculateSpellCost({
        domain: 'bio',
        base_cost: 100,
        targets_life_aura: true,
        caster_skill_level: 50
      });
      expect(resultNovice.life_aura_penetrated).toBe(false);
      expect(resultNovice.instability_risk).toBe(100);

      const resultMaster = magicService.calculateSpellCost({
        domain: 'bio',
        base_cost: 100,
        targets_life_aura: true,
        caster_skill_level: 85
      });
      expect(resultMaster.life_aura_penetrated).toBe(true);
      expect(resultMaster.life_aura_cost).toBe(3000);
      expect(resultMaster.total_mana_cost).toBe(400 + 3000);
    });

    it('should calculate cast time when spell cost exceeds caster flow', () => {
      const result = magicService.calculateSpellCost({
        domain: 'space',
        base_cost: 100,
        caster_mana_flow: 200
      });
      expect(result.can_cast_instantly).toBe(false);
      expect(result.cast_time_minutes).toBe(8);
    });
  });

  describe('4. Magic Item Evaluation (evaluateMagicItemProperties)', () => {
    it('should recognize Potion with mana_restore', () => {
      const res = magicService.evaluateMagicItemProperties({ mana_restore: 100 });
      expect(res.is_valid).toBe(true);
      expect(res.item_type).toBe('potion');
      expect(res.details.mana_restore).toBe(100);
    });

    it('should recognize Storage Crystal with mana_capacity', () => {
      const res = magicService.evaluateMagicItemProperties({ mana_capacity: 500, mana_current: 300 });
      expect(res.is_valid).toBe(true);
      expect(res.item_type).toBe('crystal');
      expect(res.details.mana_capacity).toBe(500);
    });

    it('should recognize Focus Wand with stability_bonus', () => {
      const res = magicService.evaluateMagicItemProperties({
        stability_bonus: { target: 'fire_magic', amount: 35 }
      });
      expect(res.is_valid).toBe(true);
      expect(res.item_type).toBe('focus');
      expect(res.details.stability_bonus?.amount).toBe(35);
    });

    it('should recognize Programmed Artifact with spell_matrix', () => {
      const res = magicService.evaluateMagicItemProperties({
        spell_matrix: 'fireball',
        concentration_required: false
      });
      expect(res.is_valid).toBe(true);
      expect(res.item_type).toBe('artifact');
      expect(res.details.spell_matrix).toBe('fireball');
    });

    it('should recognize Autonomous Device with spell_matrix and mana_capacity', () => {
      const res = magicService.evaluateMagicItemProperties({
        spell_matrix: 'light',
        mana_capacity: 100,
        requires_mage: false
      });
      expect(res.is_valid).toBe(true);
      expect(res.item_type).toBe('device');
      expect(res.details.requires_mage).toBe(false);
    });
  });
});
