import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { ItemRepository } from '../repositories/item.repository';
import { ItemService } from '../services/item.service';
import { ItemInstance } from '../schemas/item.schema';

describe('ItemService & Master Tools & Data Isolation', () => {
  let db: Database.Database;
  let itemRepo: ItemRepository;
  let itemService: ItemService;
  const testDbPath = path.resolve(__dirname, 'test_items.db');

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
    `);

    itemRepo = new ItemRepository(db);
    itemService = new ItemService(itemRepo);

    // Save sample template
    itemRepo.saveTemplate({
      template_id: 'tpl_iron_sword',
      category: 'weapon',
      public_profile: {
        name: 'Залізний меч',
        appearance: 'Звичайний залізний меч.',
        public_description: 'Стандартна зброя пишночолих воїнів.'
      },
      physical_properties: {
        weight_kg: 2.5,
        durability: { current: 100, max: 100, state: 'intact' },
        base_value_gold: 20
      },
      special_mechanics: null,
    });
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  it('should resolve template inheritance correctly', () => {
    const rawItem: ItemInstance = {
      item_id: 'item_sword_01',
      template_id: 'tpl_iron_sword',
      category: 'weapon',
      public_profile: { name: 'Залізний меч', appearance: 'Звичайний залізний меч.', public_description: 'Стандартна зброя пишночолих воїнів.' },
      private_profile: null,
      physical_properties: { weight_kg: 2.5, durability: { current: 80, max: 100, state: 'worn' }, base_value_gold: 20 },
      special_mechanics: null,
      location_context: { current_owner_type: 'player', current_owner_id: 'player_1' },
    };

    itemRepo.saveItem(rawItem);
    const resolved = itemService.getItemContext(['item_sword_01'])[0];

    expect(resolved.physical_properties.durability.state).toBe('worn');
    expect(resolved.physical_properties.durability.current).toBe(80);
    expect(resolved.public_profile.name).toBe('Залізний меч');
  });

  it('should enforce data isolation rules for unidentified items with hidden secrets', () => {
    const magicRing: ItemInstance = {
      item_id: 'item_secret_ring',
      template_id: null,
      category: 'jewelry',
      public_profile: { name: 'Перстень', appearance: 'Срібний перстень', public_description: 'Потерте кільце' },
      private_profile: {
        true_name: 'Перстень Тіней',
        identification_status: 'unidentified',
        hidden_secrets: [
          { secret_id: 'sec_1', secret_type: 'magical_power', description: 'Невидимість', discovery_status: 'hidden' }
        ],
        magical_properties: { is_magical: true, active_enchantments: [], focus_properties: null, mana_source: null }
      },
      physical_properties: { weight_kg: 0.1, durability: { current: 100, max: 100, state: 'intact' }, base_value_gold: 10 },
      special_mechanics: null,
      location_context: { current_owner_type: 'player', current_owner_id: 'player_1' }
    };

    itemRepo.saveItem(magicRing);

    // Isolated check
    const publicData = itemService.toPublicIsolatedItem(magicRing);
    expect(publicData.private_profile).toBeNull();

    // Now reveal secret via tool 5
    itemService.revealItemSecret('item_secret_ring', 'sec_1');

    const updatedRaw = itemRepo.getItem('item_secret_ring')!;
    const updatedPublic = itemService.toPublicIsolatedItem(updatedRaw);

    expect(updatedPublic.private_profile).toBeDefined();
    expect(updatedPublic.private_profile?.hidden_secrets?.length).toBe(1);
    expect(updatedPublic.private_profile?.hidden_secrets?.[0].secret_id).toBe('sec_1');
  });

  it('should execute Master Tools correctly (create_item, unlock_container, read_document)', () => {
    // Tool 3: create_item
    const createdContainer = itemService.createItem({
      item_id: 'chest_01',
      template_id: null,
      category: 'container',
      public_profile: { name: 'Скриня з магією', appearance: 'Стара скриня', public_description: 'Дерев’яна скриня' },
      location_context: { current_owner_type: 'location', current_owner_id: 'loc_tavern' },
      special_mechanics: {
        container_properties: {
          capacity_weight_kg: 20,
          contained_item_ids: [],
          lock_details: { is_locked: true, key_id: 'golden_key', lockpick_dc: 15 },
          trap_details: { has_trap: true, is_disarmed: false, trap_description: 'Отрута', trap_dc: 12, discovery_status: 'hidden' }
        }
      }
    });

    expect(createdContainer.item_id).toBe('chest_01');

    // Tool 6: unlock_container (fail with wrong key)
    const failResult = itemService.unlockContainer('chest_01', 'wrong_key');
    expect(failResult.success).toBe(false);
    expect(failResult.is_locked).toBe(true);
    expect(failResult.trap_triggered).toBe(true);

    // Tool 6: unlock_container (succeed with correct key)
    const successResult = itemService.unlockContainer('chest_01', 'golden_key');
    expect(successResult.success).toBe(true);
    expect(successResult.is_locked).toBe(false);

    // Tool 3: create document & Tool 7: read_document
    itemService.createItem({
      item_id: 'doc_01',
      category: 'document',
      public_profile: { name: 'Таємна грамота', appearance: 'Сувій', public_description: 'Згорнутий сувій' },
      location_context: { current_owner_type: 'player', current_owner_id: 'player_1' },
      special_mechanics: {
        document_properties: {
          text_content: 'Скарб заритий під старим дубом.',
          language: 'Ельфійська',
          is_encrypted: true,
          decryption_dc: 15,
        }
      }
    });

    const readFail = itemService.readDocument('doc_01', 'Ельфійська', 10);
    expect(readFail.can_read).toBe(false);

    const readSuccess = itemService.readDocument('doc_01', 'Ельфійська', 18);
    expect(readSuccess.can_read).toBe(true);
    expect(readSuccess.text_content).toBe('Скарб заритий під старим дубом.');
  });
});
