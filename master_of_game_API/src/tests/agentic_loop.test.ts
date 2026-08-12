import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { DatabaseRepository } from '../persistence/database_repository';
import { ContextAssemblyService } from '../services/agentic_loop/context_assembly.service';
import { SubagentOrchestratorService } from '../services/agentic_loop/subagent_orchestrator.service';
import { CompressionService } from '../services/agentic_loop/compression.service';
import { SemanticMemoryService } from '../services/semantic_memory.service';
import { SemanticMemoryRepository } from '../repositories/semantic_memory.repository';
import { ILLMProvider } from '../providers/llm/llm_provider.interface';

describe('F012 Agentic Loop Services', () => {
  let db: Database.Database;
  let repo: DatabaseRepository;
  let memoryService: SemanticMemoryService;
  const testDbPath = path.resolve(__dirname, 'test_agentic_loop.db');

  const mockLLMProvider: ILLMProvider = {
    id: 'openai_compatible',
    generate: async (req) => {
      const userMsg = req.messages.find((m) => m.role === 'user')?.content || '';
      if (userMsg.includes('мани')) {
        return {
          content: null,
          toolCalls: [
            {
              id: 'call_1',
              type: 'function',
              function: {
                name: 'update_player_state',
                arguments: JSON.stringify({ mana_delta: -10 }),
              },
            },
          ],
        };
      }
      if (userMsg.includes('виснаження')) {
        return {
          content: null,
          toolCalls: [
            {
              id: 'call_2',
              type: 'function',
              function: {
                name: 'update_player_state',
                arguments: JSON.stringify({ add_physical_states: ['Тяжке виснаження'] }),
              },
            },
          ],
        };
      }
      if (userMsg.includes('Гриць') || userMsg.includes('NPC')) {
        return {
          content: null,
          toolCalls: [
            {
              id: 'call_3',
              type: 'function',
              function: {
                name: 'create_or_update_npc',
                arguments: JSON.stringify({ name: 'Торговець Гриць', role: 'trader' }),
              },
            },
          ],
        };
      }
      if (userMsg.includes('монет')) {
        return {
          content: null,
          toolCalls: [
            {
              id: 'call_4',
              type: 'function',
              function: {
                name: 'update_property_finances_and_items',
                arguments: JSON.stringify({ coins_delta: 50 }),
              },
            },
          ],
        };
      }
      if (userMsg.includes('факел') || userMsg.includes('предмет')) {
        return {
          content: null,
          toolCalls: [
            {
              id: 'call_5',
              type: 'function',
              function: {
                name: 'update_property_finances_and_items',
                arguments: JSON.stringify({ add_item_name: 'Магічний факел' }),
              },
            },
          ],
        };
      }
      if (userMsg.includes('зливу') || userMsg.includes('погоду')) {
        return {
          content: null,
          toolCalls: [
            {
              id: 'call_6',
              type: 'function',
              function: {
                name: 'update_world_environment',
                arguments: JSON.stringify({ weather_type: 'downpour' }),
              },
            },
          ],
        };
      }
      return { content: 'OK' };
    },
    stream: async function* () {},
  };

  beforeEach(async () => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    db = new Database(testDbPath);
    repo = new DatabaseRepository();
    (repo as any).db = db;
    (repo as any).sessionId = 'sess_test_123';

    const memoryRepo = new SemanticMemoryRepository(db);
    memoryService = new SemanticMemoryService(memoryRepo);

    // Initialize tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS short_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        turn_number INTEGER NOT NULL,
        content TEXT NOT NULL,
        is_compressed INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS long_context (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        turn_number INTEGER NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('player', 'master')),
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS session_summaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        summary_text TEXT NOT NULL,
        compressed_until_turn INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS player_state (
        session_id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int))
      );

      CREATE TABLE IF NOT EXISTS npcs (
        npc_id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT,
        current_location_id TEXT,
        data TEXT NOT NULL,
        created_at INTEGER,
        updated_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS npc_relationships (
        source_npc_id TEXT,
        target_npc_id TEXT,
        relationship_type TEXT,
        strength INTEGER,
        summary TEXT,
        last_updated INTEGER,
        PRIMARY KEY(source_npc_id, target_npc_id)
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
        created_at INTEGER,
        updated_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        metadata TEXT
      );

      CREATE TABLE IF NOT EXISTS world_time_weather (
        id INTEGER PRIMARY KEY,
        current_date TEXT NOT NULL,
        weather_timeline TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  it('should assemble system prompt incorporating Summary, RAG, and Short Context', async () => {
    // Seed summary
    db.prepare(`INSERT INTO session_summaries (session_id, summary_text, compressed_until_turn) VALUES (?, ?, ?)`).run('sess_test_123', 'Глава 1: Герой увівшов у підземелля.', 5);

    // Seed F017 Memory
    memoryService.indexRecord({
      session_id: 'sess_test_123',
      turn_number: 2,
      role: 'system',
      content: 'Знайдено магічний перстень з печатки.',
      tags: ['item:ring'],
    });

    const assembly = new ContextAssemblyService(repo, memoryService);
    const prompt = await assembly.assembleMasterSystemPrompt('sess_test_123', 'Де перстень?');

    expect(prompt).toContain('Глава 1: Герой увівшов у підземелля.');
    expect(prompt).toContain('Знайдено магічний перстень з печатки.');
  });

  it('should execute pure LLM actor subagent instructions for mana, effects, and NPCs', async () => {
    const orchestrator = new SubagentOrchestratorService(repo, memoryService, mockLLMProvider, 'test-model');

    // 1. Mana update
    const manaRes = await orchestrator.executeSubagentInstruction('sess_test_123', 'actor', 'Зніми 10 мани у гравця');
    expect(manaRes.success).toBe(true);
    expect(manaRes.message).toContain('Стан гравця успішно оновлено');

    // 2. Status effect application
    const effectRes = await orchestrator.executeSubagentInstruction(
      'sess_test_123',
      'actor',
      'Накласти негативний ефект "Тяжке виснаження" на гравця'
    );
    expect(effectRes.success).toBe(true);
    expect(effectRes.message).toContain('Стан гравця успішно оновлено');

    const playerRepo = repo.getPlayerStateRepository();
    const playerState = playerRepo.getPlayerState('sess_test_123');
    expect(playerState.physical_states.some((s) => s.name === 'Тяжке виснаження')).toBe(true);

    // 3. NPC Creation
    const npcRes = await orchestrator.executeSubagentInstruction('sess_test_123', 'actor', 'Створити NPC "Торговець Гриць"');
    expect(npcRes.success).toBe(true);
    expect(npcRes.message).toContain('Торговець Гриць');
  });

  it('should execute pure LLM property subagent instructions for coins and items', async () => {
    const orchestrator = new SubagentOrchestratorService(repo, memoryService, mockLLMProvider, 'test-model');

    const cashRes = await orchestrator.executeSubagentInstruction('sess_test_123', 'property', 'Додай 50 монет');
    expect(cashRes.success).toBe(true);
    expect(cashRes.message).toContain('Майно гравця успішно оновлено');

    const itemRes = await orchestrator.executeSubagentInstruction('sess_test_123', 'property', 'Додай предмет "Магічний факел"');
    expect(itemRes.success).toBe(true);
    expect(itemRes.message).toContain('Майно гравця успішно оновлено');
  });

  it('should execute pure LLM world subagent instructions for weather', async () => {
    const orchestrator = new SubagentOrchestratorService(repo, memoryService, mockLLMProvider, 'test-model');

    const weatherRes = await orchestrator.executeSubagentInstruction('sess_test_123', 'world', 'Зміни погоду на зливу');
    expect(weatherRes.success).toBe(true);
    expect(weatherRes.message).toContain('downpour');
  });

  it('should compress session context according to 80/20 rule', async () => {
    // Seed 5 short logs
    for (let i = 1; i <= 5; i++) {
      db.prepare(`INSERT INTO short_logs (session_id, turn_number, content) VALUES (?, ?, ?)`).run('sess_test_123', i, `Подія ходу ${i}`);
    }

    const compression = new CompressionService(repo);
    const result = await compression.compressSessionContext('sess_test_123', true);

    expect(result.success).toBe(true);
    expect(result.compressedLogsCount).toBe(5);

    const remainingUncompressed = db.prepare(`SELECT count(*) as cnt FROM short_logs WHERE session_id = ? AND is_compressed = 0`).get('sess_test_123') as any;
    expect(remainingUncompressed.cnt).toBe(0);
  });
});
