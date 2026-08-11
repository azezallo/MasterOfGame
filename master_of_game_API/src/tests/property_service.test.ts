import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { PropertyRepository } from '../repositories/property.repository';
import { ItemRepository } from '../repositories/item.repository';
import { PropertyService } from '../services/property.service';

describe('PropertyService & Master Tools & Data Isolation', () => {
  let db: Database.Database;
  let propertyRepo: PropertyRepository;
  let itemRepo: ItemRepository;
  let propertyService: PropertyService;
  const testDbPath = path.resolve(__dirname, 'test_property.db');

  beforeEach(() => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    db = new Database(testDbPath);

    db.exec(`
      CREATE TABLE IF NOT EXISTS item_templates (
        template_id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        public_profile TEXT NOT NULL,
        physical_properties TEXT NOT NULL,
        special_mechanics TEXT,
        created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int))
      );

      CREATE TABLE IF NOT EXISTS items (
        item_id TEXT PRIMARY KEY,
        template_id TEXT,
        category TEXT NOT NULL,
        public_profile TEXT NOT NULL,
        private_profile TEXT,
        physical_properties TEXT NOT NULL,
        special_mechanics TEXT,
        location_context TEXT NOT NULL,
        created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
        updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int))
      );

      CREATE TABLE IF NOT EXISTS properties (
        property_profile_id TEXT PRIMARY KEY,
        owner_type TEXT NOT NULL,
        owner_id TEXT NOT NULL,
        equipped TEXT NOT NULL,
        pocket_inventory TEXT NOT NULL,
        finances TEXT NOT NULL,
        real_estate TEXT NOT NULL,
        storage_caches TEXT NOT NULL,
        vehicles_and_mounts TEXT NOT NULL,
        created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
        updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
        UNIQUE(owner_type, owner_id)
      );
    `);

    propertyRepo = new PropertyRepository(db);
    itemRepo = new ItemRepository(db);
    propertyService = new PropertyService(propertyRepo, itemRepo);

    itemRepo.saveItem({
      item_id: 'heavy_sword',
      template_id: null,
      category: 'weapon',
      public_profile: { name: 'Важкий дворучний меч', appearance: 'Меч', public_description: 'Великий меч' },
      private_profile: null,
      physical_properties: { weight_kg: 10.0, durability: { current: 100, max: 100, state: 'intact' }, base_value_gold: 50 },
      special_mechanics: null,
      location_context: { current_owner_type: 'player', current_owner_id: 'player_1' },
    });

    itemRepo.saveItem({
      item_id: 'heavy_backpack_item',
      template_id: null,
      category: 'misc',
      public_profile: { name: 'Важка руда', appearance: 'Руда', public_description: 'Шматок залізни' },
      private_profile: null,
      physical_properties: { weight_kg: 25.0, durability: { current: 100, max: 100, state: 'intact' }, base_value_gold: 10 },
      special_mechanics: null,
      location_context: { current_owner_type: 'player', current_owner_id: 'player_1' },
    });
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  it('should recalculate weight stats and encumbrance statuses correctly', () => {
    let profile = propertyService.getOwnerProperty('player', 'player_1');

    profile.pocket_inventory.pockets_and_belt.items.push({ item_id: 'heavy_sword', quantity: 1, custom_label: null });
    profile.pocket_inventory.backpack.items.push({ item_id: 'heavy_backpack_item', quantity: 1, custom_label: null });

    profile = propertyService.recalculateWeightStats(profile, 30.0);

    expect(profile.pocket_inventory.weight_stats.equipped_and_pockets_weight_kg).toBe(10.0);
    expect(profile.pocket_inventory.weight_stats.backpack_weight_kg).toBe(25.0);
    expect(profile.pocket_inventory.weight_stats.total_weight_kg).toBe(35.0);
    expect(profile.pocket_inventory.weight_stats.encumbrance_status).toBe('heavy');
    expect(profile.pocket_inventory.weight_stats.combat_encumbrance_status).toBe('normal');

    propertyService.toggleBackpack({ owner_id: 'player_1', is_equipped: false });
    const updated = propertyService.getOwnerProperty('player', 'player_1');

    expect(updated.pocket_inventory.weight_stats.encumbrance_status).toBe('normal');
  });

  it('should equip and unequip items correctly', () => {
    let profile = propertyService.getOwnerProperty('player', 'player_1');
    profile.pocket_inventory.pockets_and_belt.items.push({ item_id: 'heavy_sword', quantity: 1, custom_label: null });
    propertyRepo.savePropertyProfile(profile);

    const equippedProfile = propertyService.equipItem({
      owner_id: 'player_1',
      item_id: 'heavy_sword',
      body_zone: 'right_hand',
      layer: 'middle',
    });

    expect(equippedProfile.equipped.length).toBe(1);
    expect(equippedProfile.equipped[0].item_id).toBe('heavy_sword');
    expect(equippedProfile.pocket_inventory.pockets_and_belt.items.length).toBe(0);

    const unequippedProfile = propertyService.unequipItem({
      owner_id: 'player_1',
      item_id: 'heavy_sword',
    });

    expect(unequippedProfile.equipped.length).toBe(0);
    expect(unequippedProfile.pocket_inventory.pockets_and_belt.items.length).toBe(1);
  });

  it('should execute Master Tools for finances, real estate, and vehicle status', () => {
    propertyService.modifyFinances({ owner_type: 'player', owner_id: 'player_1', operation: 'add', amount_coins: 1000 });
    let profile = propertyService.getOwnerProperty('player', 'player_1');
    expect(profile.finances.coins).toBe(1000);

    propertyService.registerRealEstate({
      owner_id: 'player_1',
      location_id: 'loc_tavern_room',
      property_name: 'Кімната в Таверні',
      ownership_type: 'rented',
      rent_details: { cost_per_day_coins: 10, paid_until_day: 5 },
      create_storage_cache: true,
    });

    profile = propertyService.getOwnerProperty('player', 'player_1');
    expect(profile.real_estate.length).toBe(1);
    expect(profile.storage_caches.length).toBe(1);

    propertyService.payRent('player_1', profile.real_estate[0].property_id, 3);
    profile = propertyService.getOwnerProperty('player', 'player_1');
    expect(profile.finances.coins).toBe(970);
    expect(profile.real_estate[0].rent_details?.paid_until_day).toBe(8);
  });

  it('should isolate private NPC properties when requested by client', () => {
    let npcProfile = propertyService.getOwnerProperty('npc', 'npc_guard_1');
    npcProfile.equipped.push({
      equipped_instance_id: 'eq_guard_1',
      item_id: 'heavy_sword',
      body_zone: 'right_hand',
      layer: 'middle',
      worn_over_item_id: null,
      attached_pendants_ids: [],
      interaction_state: { is_active: true, is_blocked: false },
    });
    npcProfile.finances.coins = 500;
    npcProfile.pocket_inventory.pockets_and_belt.items.push({ item_id: 'heavy_sword', quantity: 1, custom_label: null });
    propertyRepo.savePropertyProfile(npcProfile);

    const isolated = propertyService.toPublicIsolatedProperty(npcProfile, 'player', 'player_1');
    expect(isolated.equipped?.length).toBe(1);
    expect(isolated.finances?.coins).toBe(0);
    expect(isolated.pocket_inventory?.pockets_and_belt.items.length).toBe(0);
    expect(isolated.real_estate?.length).toBe(0);
  });

  it('should synchronize items when putting and taking from storage cache', () => {
    let profile = propertyService.getOwnerProperty('player', 'player_1');
    profile.pocket_inventory.pockets_and_belt.items.push({ item_id: 'heavy_sword', quantity: 2, custom_label: null });
    profile.storage_caches.push({
      cache_id: 'cache_test_01',
      location_id: 'loc_test',
      name: 'Скриня',
      container_item_id: null,
      access_type: 'private',
      allowed_user_ids: ['player_1'],
      items: [],
    });
    propertyRepo.savePropertyProfile(profile);

    // Put item in storage
    const updatedPut = propertyService.transferToFromStorage('player_1', 'cache_test_01', 'put', 'heavy_sword', 1);
    const cacheAfterPut = updatedPut.storage_caches.find(c => c.cache_id === 'cache_test_01');
    expect(cacheAfterPut?.items?.length).toBe(1);
    expect(cacheAfterPut?.items?.[0].quantity).toBe(1);
    expect(updatedPut.pocket_inventory.pockets_and_belt.items[0].quantity).toBe(1);

    // Take item from storage
    const updatedTake = propertyService.transferToFromStorage('player_1', 'cache_test_01', 'take', 'heavy_sword', 1);
    const cacheAfterTake = updatedTake.storage_caches.find(c => c.cache_id === 'cache_test_01');
    expect(cacheAfterTake?.items?.length).toBe(0);
    expect(updatedTake.pocket_inventory.pockets_and_belt.items[0].quantity).toBe(2);
  });
});
