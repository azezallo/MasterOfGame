import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { NpcRepository } from '../repositories/npc.repository';
import { NpcService } from '../services/npc.service';

describe('NpcService Unit Tests', () => {
  let db: Database.Database;
  let npcRepo: NpcRepository;
  let npcService: NpcService;
  const testDbPath = path.resolve(__dirname, 'test_npcs.db');

  beforeEach(() => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    db = new Database(testDbPath);

    db.exec(`
      CREATE TABLE IF NOT EXISTS npcs (
        npc_id TEXT PRIMARY KEY,
        status TEXT NOT NULL DEFAULT 'alive',
        name TEXT NOT NULL,
        role TEXT,
        current_location_id TEXT,
        data TEXT NOT NULL,
        created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
        updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int))
      );

      CREATE TABLE IF NOT EXISTS npc_relationships (
        source_npc_id TEXT NOT NULL,
        target_npc_id TEXT NOT NULL,
        relationship_type TEXT NOT NULL,
        strength REAL DEFAULT 0,
        summary TEXT,
        last_updated INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
        PRIMARY KEY (source_npc_id, target_npc_id)
      );
    `);

    npcRepo = new NpcRepository(db);
    npcService = new NpcService(npcRepo);
  });

  afterEach(() => {
    if (db) db.close();
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  });

  it('should create an NPC and retrieve it', () => {
    const npc = npcService.createNpc({
      npc_id: 'npc_test_01',
      public_profile: {
        name: 'Торін',
        role: 'Коваль',
        appearance: 'Міцний чоловік з фартухом.',
        public_description: 'Майстер зброяр.',
      },
      location_id: 'loc_smithy',
    });

    expect(npc.npc_id).toBe('npc_test_01');
    expect(npc.public_profile.name).toBe('Торін');

    const fetched = npcService.getNpc('npc_test_01');
    expect(fetched).not.toBeNull();
    expect(fetched?.public_profile.role).toBe('Коваль');
  });

  it('should perform context mode optimizations DIALOG, ACTION, INVESTIGATION', () => {
    npcService.createNpc({
      npc_id: 'npc_test_02',
      public_profile: { name: 'Едгар', role: 'Корчмар', appearance: '', public_description: '' },
    });

    const dialogContext = npcService.getNpcContext('npc_test_02', 'DIALOG');
    expect(dialogContext.public_profile?.name).toBe('Едгар');
    expect(dialogContext.private_profile).toBeDefined();

    const actionContext = npcService.getNpcContext('npc_test_02', 'ACTION');
    expect(actionContext.spatial_presence).toBeDefined();

    const investigationContext = npcService.getNpcContext('npc_test_02', 'INVESTIGATION');
    expect(investigationContext.knowledge?.hidden_memory).toBeDefined();
  });

  it('should reveal NPC secret correctly', () => {
    const npc = npcService.createNpc({
      npc_id: 'npc_secret_01',
      public_profile: { name: 'Секретний персонаж', role: 'Шпигун', appearance: '', public_description: 'Опис.' },
    });

    npcService.addNpcSecret('npc_secret_01', {
      secret_id: 'sec_01',
      description: 'Справжній агент ордену',
      discovery_status: 'hidden',
    });

    const updated = npcService.revealNpcSecret('npc_secret_01', 'sec_01');
    const secret = updated.knowledge.hidden_memory.secrets.find(s => s.secret_id === 'sec_01');
    expect(secret?.discovery_status).toBe('discovered_by_player');
    // Revealed secrets are shown separately on UI — public_description must NOT be modified
    expect(updated.public_profile.public_description).toBe('Опис.');
  });

  it('should isolate private data for PublicIsolatedNpc transformer', () => {
    const npc = npcService.createNpc({
      npc_id: 'npc_isolation_01',
      public_profile: { name: 'Гаррік', role: 'Купець', appearance: '', public_description: '' },
    });

    npcService.addNpcSecret('npc_isolation_01', {
      secret_id: 'sec_hidden',
      description: 'Прихована таємниця',
      discovery_status: 'hidden',
    });

    const isolated = npcService.toPublicIsolatedNpc(npc);
    expect((isolated as any).private_profile).toBeUndefined();
    expect(isolated.knowledge.revealed_secrets.length).toBe(0);
  });

  it('should update player notes successfully', () => {
    npcService.createNpc({
      npc_id: 'npc_notes_01',
      public_profile: { name: 'Персонаж з нотатками', role: 'Міщанин', appearance: '', public_description: '' },
    });

    const updated = npcService.updatePlayerNotes('npc_notes_01', 'Важливі нотатки гравця');
    expect(updated.knowledge.player_notes.content).toBe('Важливі нотатки гравця');
  });
});
