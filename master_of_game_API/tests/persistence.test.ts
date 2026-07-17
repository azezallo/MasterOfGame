import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseRepository } from '../src/persistence/database_repository';
import { CONFIG } from '../src/config';
import fs from 'fs';
import path from 'path';

describe('DatabaseRepository', () => {
  let repository: DatabaseRepository;
  const testPlayerId = 'test-player-uuid';
  const testSessionId = 'test-session-uuid';

  beforeEach(async () => {
    console.log('Repository instance:', repository);
    repository = new DatabaseRepository();
    await repository.initializeDB(testPlayerId, testSessionId);

    await repository.saveMetadata({
      sessionId: testSessionId,
      gameName: 'TestGame',
      characterName: 'TestCharacter',
      createdAt: new Date().toISOString(),
      lastPlayedAt: Math.floor(Date.now() / 1000),
      version: 1,
    });
  });

  afterEach(() => {
    repository.close();
    // Clean up the test database file
    const dbPath = path.resolve(CONFIG.SAVES_DIR, testPlayerId, `${testSessionId}.db`);
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    // Clean up directory if empty
    const dirPath = path.dirname(dbPath);
    if (fs.existsSync(dirPath) && fs.readdirSync(dirPath).length === 0) {
      fs.rmdirSync(dirPath);
    }
  });

  it('should save and load metadata', async () => {
    const metadata = {
      sessionId: testSessionId,
      gameName: 'TestGame',
      characterName: 'TestCharacter',
      createdAt: new Date().toISOString(),
      lastPlayedAt: Math.floor(Date.now() / 1000),
      version: 1,
    };

    await repository.saveMetadata(metadata);
    const loaded = await repository.loadMetadata();

    expect(loaded).not.toBeNull();
    expect(loaded?.sessionId).toBe(testSessionId);
    expect(loaded?.gameName).toBe('TestGame');
    expect(loaded?.characterName).toBe('TestCharacter');
    expect(loaded?.version).toBe(1);
  });

  it('should save and load inventory items', async () => {
    await repository.saveItem({ itemId: 'sword-1', quantity: 1 });
    await repository.saveItem({ itemId: 'potion-1', quantity: 5, metadata: { healing: 50 } });

    const items = await repository.loadItems();
    expect(items).toHaveLength(2);
    expect(items[0].itemId).toBe('sword-1');
    expect(items[1].metadata).toEqual({ healing: 50 });
  });

  it('should load a single inventory item', async () => {
    await repository.saveItem({ itemId: 'sword-1', quantity: 1 });
    const item = await repository.loadItem('sword-1');
    expect(item).not.toBeNull();
    expect(item?.itemId).toBe('sword-1');
    expect(item?.quantity).toBe(1);
  });

  it('should update an inventory item', async () => {
    await repository.saveItem({ itemId: 'potion-1', quantity: 5, metadata: { healing: 50 } });
    await repository.updateItem('potion-1', 10, { healing: 100 });
    
    const item = await repository.loadItem('potion-1');
    expect(item?.quantity).toBe(10);
    expect(item?.metadata).toEqual({ healing: 100 });
  });

  it('should save and load npcs', async () => {
    await repository.saveNPC({
      entityId: 'npc-1',
      type: 'trader',
      position: { x: 10, y: 0, z: 10 },
      data: { name: 'Old Man' }
    });

    const npcs = await repository.loadNPCs();
    expect(npcs).toHaveLength(1);
    expect(npcs[0].entityId).toBe('npc-1');
    expect(npcs[0].data).toEqual({ name: 'Old Man' });
  });

  it('should load a single NPC', async () => {
    await repository.saveNPC({
      entityId: 'npc-1',
      type: 'trader',
      position: { x: 10, y: 0, z: 10 },
      data: { name: 'Old Man' }
    });

    const npc = await repository.loadNPC('npc-1');
    expect(npc).not.toBeNull();
    expect(npc?.entityId).toBe('npc-1');
    expect(npc?.type).toBe('trader');
  });

  it('should run transactions', () => {
    repository.runTransaction((db) => {
      db.prepare('CREATE TABLE IF NOT EXISTS temp_test (id INTEGER)').run();
      db.prepare('INSERT INTO temp_test VALUES (1)').run();
    });

    const rows = repository.db?.prepare('SELECT * FROM temp_test').all();
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(1);
  });
});
