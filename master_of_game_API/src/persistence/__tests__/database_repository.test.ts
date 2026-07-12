import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import { DatabaseRepository } from '../database_repository';
import { CONFIG } from '../../config';

// Use a temporary directory for testing
const TEST_SAVES_DIR = path.resolve(process.cwd(), 'test_saves');
const dbPath = path.resolve(TEST_SAVES_DIR, 'test_player', 'test_session.db');

describe('DatabaseRepository', () => {
  let repo: DatabaseRepository;
  const playerId = 'test_player';
  const sessionId = 'test_session';

  beforeAll(() => {
    if (!fs.existsSync(TEST_SAVES_DIR)) {
      fs.mkdirSync(TEST_SAVES_DIR, { recursive: true });
    }
  });

  beforeEach(() => {
    // Clean up test saves before each test
    const dirPath = path.dirname(dbPath);
    if (fs.existsSync(dirPath)) {
      try {
        fs.rmSync(dirPath, { recursive: true, force: true });
      } catch (e) {
        // Ignore permission errors on Windows
      }
    }
    fs.mkdirSync(dirPath, { recursive: true });

    repo = new DatabaseRepository();
    // Override CONFIG.SAVES_DIR for this repository instance
    (CONFIG as any).SAVES_DIR = TEST_SAVES_DIR;
    repo.initializeDB(playerId, sessionId);
  });

  afterAll(() => {
    if (fs.existsSync(TEST_SAVES_DIR)) {
      try {
        fs.rmSync(TEST_SAVES_DIR, { recursive: true, force: true });
      } catch (e) {
        // Ignore permission errors on Windows
      }
    }
  });

  it('should initialize the database and create tables', () => {
    expect(fs.existsSync(dbPath)).toBe(true);
    expect(repo.loadMetadata()).toBeNull(); // Table exists but empty
  });

  it('should save and load items', () => {
    const item = { itemId: 'item_1', quantity: 10, metadata: { color: 'red' } };
    const id = repo.saveItem(item);
    expect(id).toBeGreaterThan(0);

    const items = repo.loadItems();
    expect(items.length).toBe(1);
    expect(items[0].itemId).toBe('item_1');
    expect(items[0].quantity).toBe(10);
    expect(items[0].metadata).toEqual({ color: 'red' });

    const loadedItem = repo.loadItem('item_1');
    expect(loadedItem).not.toBeNull();
    expect(loadedItem?.itemId).toBe('item_1');
  });

  it('should update an existing item', () => {
    const item = { itemId: 'item_2', quantity: 5 };
    repo.saveItem(item);

    repo.updateItem('item_2', 20, { weight: 1 });
    const loadedItem = repo.loadItem('item_2');
    expect(loadedItem?.quantity).toBe(20);
    expect(loadedItem?.metadata).toEqual({ weight: 1 });
  });

  it('should save and load NPCs', () => {
    const npc = {
      entityId: 'npc_1',
      type: 'merchant',
      position: { x: 10, y: 20, z: 30 },
      data: { name: 'Old Man' }
    };
    repo.saveNPC(npc);

    const npcs = repo.loadNPCs();
    expect(npcs.length).toBe(1);
    expect(npcs[0].entityId).toBe('npc_1');
    expect(npcs[0].position).toEqual({ x: 10, y: 20, z: 30 });
    expect(npcs[0].data).toEqual({ name: 'Old Man' });

    const loadedNpc = repo.loadNPC('npc_1');
    expect(loadedNpc).not.toBeNull();
    expect(loadedNpc?.entityId).toBe('npc_1');
  });

  it('should save and load metadata', () => {
    const metadata = {
      sessionId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    };
    repo.saveMetadata(metadata);

    const loadedMetadata = repo.loadMetadata();
    expect(loadedMetadata).not.toBeNull();
    expect(loadedMetadata?.sessionId).toBe(sessionId);
    expect(loadedMetadata?.version).toBe(1);
  });

  it('should handle transactions atomically', () => {
    // First, ensure we have some data to rollback from if needed
    repo.saveMetadata({
      sessionId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    });

    try {
      repo.runTransaction((db) => {
        repo.saveMetadata({
          sessionId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 2,
        });
        throw new Error('Simulated failure');
      });
    } catch (e: any) {
      expect(e.message).toBe('Simulated failure');
    }

    // Metadata version should still be 1
    const loadedMetadata = repo.loadMetadata();
    expect(loadedMetadata?.version).toBe(1);
  });
});
