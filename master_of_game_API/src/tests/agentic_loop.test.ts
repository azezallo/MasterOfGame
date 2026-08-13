import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { DatabaseRepository } from '../persistence/database_repository';
import { ContextAssemblyService } from '../services/agentic_loop/context_assembly.service';
import { SubagentOrchestratorService } from '../services/agentic_loop/subagent_orchestrator.service';
import { CompressionService } from '../services/agentic_loop/compression.service';
import { SemanticMemoryService } from '../services/semantic_memory.service';
import { SemanticMemoryRepository } from '../repositories/semantic_memory.repository';
import { ILLMProvider } from '../providers/llm/llm_provider.interface';
import { CONFIG } from '../config';

describe('F012 Agentic Loop Services', () => {
  let repo: DatabaseRepository;
  let memoryService: SemanticMemoryService;
  const testPlayerId = 'test_player_agentic';
  const testSessionId = 'sess_test_123';
  const testDbPath = path.resolve(CONFIG.SAVES_DIR, testPlayerId, `${testSessionId}.db`);

  const mockLLMProvider: ILLMProvider = {
    id: 'openai_compatible',
    generate: async (req) => {
      const userMsg = req.messages.find((m) => m.role === 'user')?.content || '';
      const toolMsg = req.messages.find((m) => m.role === 'tool')?.content || '';

      if (userMsg.includes('половину мани')) {
        if (!toolMsg) {
          // Turn 1: Inspect player state
          return {
            content: null,
            toolCalls: [
              {
                id: 'call_inspect_mana',
                type: 'function',
                function: {
                  name: 'get_player_state',
                  arguments: JSON.stringify({}),
                },
              },
            ],
          };
        } else {
          // Turn 2: Apply calculated mana reduction (-50%)
          return {
            content: null,
            toolCalls: [
              {
                id: 'call_apply_mana',
                type: 'function',
                function: {
                  name: 'update_player_state',
                  arguments: JSON.stringify({ mana_percent: -50 }),
                },
              },
            ],
          };
        }
      }

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
    repo = new DatabaseRepository();
    await repo.initializeDB(testPlayerId, testSessionId);
    const db = (repo as any).db;
    const memoryRepo = new SemanticMemoryRepository(db);
    memoryService = new SemanticMemoryService(memoryRepo);
  });

  afterEach(() => {
    repo.close();
    if (fs.existsSync(testDbPath)) {
      try { fs.unlinkSync(testDbPath); } catch {}
    }
  });

  it('should assemble system prompt incorporating Summary, RAG, and Short Context', async () => {
    repo.getAgenticLoopRepository().saveSessionSummary(testSessionId, 'Глава 1: Герой увівшов у підземелля.', 5);

    memoryService.indexRecord({
      session_id: testSessionId,
      turn_number: 2,
      role: 'system',
      content: 'Знайдено магічний перстень з печатки.',
      tags: ['item:ring'],
    });

    const assembly = new ContextAssemblyService(repo, memoryService);
    const prompt = await assembly.assembleMasterSystemPrompt(testSessionId, 'Де перстень?');

    expect(prompt).toContain('Глава 1: Герой увівшов у підземелля.');
    expect(prompt).toContain('Знайдено магічний перстень з печатки.');
  });

  it('should execute multi-turn Re-Act subagent loop (inspect state on Turn 1, mutate state on Turn 2)', async () => {
    const orchestrator = new SubagentOrchestratorService(repo, memoryService, mockLLMProvider, 'test-model');

    const multiTurnRes = await orchestrator.executeSubagentInstruction(testSessionId, 'actor', 'Зніми половину мани у гравця');
    expect(multiTurnRes.success).toBe(true);
    expect(multiTurnRes.message).toContain('Стан гравця успішно оновлено');

    const playerRepo = repo.getPlayerStateRepository();
    const playerState = playerRepo.getPlayerState(testSessionId);
    // Initial default mana from preset is 100/100, half of 100 is 50
    expect(playerState.magic_stats.current_mana).toBe(50);
  });

  it('should execute pure LLM actor subagent instructions for mana, effects, and NPCs', async () => {
    const orchestrator = new SubagentOrchestratorService(repo, memoryService, mockLLMProvider, 'test-model');

    // 1. Mana update
    const manaRes = await orchestrator.executeSubagentInstruction(testSessionId, 'actor', 'Зніми 10 мани у гравця');
    expect(manaRes.success).toBe(true);
    expect(manaRes.message).toContain('Стан гравця успішно оновлено');

    // 2. Status effect application
    const effectRes = await orchestrator.executeSubagentInstruction(
      testSessionId,
      'actor',
      'Накласти негативний ефект "Тяжке виснаження" на гравця'
    );
    expect(effectRes.success).toBe(true);
    expect(effectRes.message).toContain('Стан гравця успішно оновлено');

    const playerRepo = repo.getPlayerStateRepository();
    const playerState = playerRepo.getPlayerState(testSessionId);
    expect(playerState.physical_states.some((s) => s.name === 'Тяжке виснаження')).toBe(true);

    // 3. NPC Creation
    const npcRes = await orchestrator.executeSubagentInstruction(testSessionId, 'actor', 'Створити NPC "Торговець Гриць"');
    expect(npcRes.success).toBe(true);
    expect(npcRes.message).toContain('Торговець Гриць');
  });

  it('should execute pure LLM property subagent instructions for coins and items', async () => {
    const orchestrator = new SubagentOrchestratorService(repo, memoryService, mockLLMProvider, 'test-model');

    const cashRes = await orchestrator.executeSubagentInstruction(testSessionId, 'property', 'Додай 50 монет');
    expect(cashRes.success).toBe(true);
    expect(cashRes.message).toContain('Майно гравця успішно оновлено');

    const itemRes = await orchestrator.executeSubagentInstruction(testSessionId, 'property', 'Додай предмет "Магічний факел"');
    expect(itemRes.success).toBe(true);
    expect(itemRes.message).toContain('Майно гравця успішно оновлено');
  });

  it('should execute pure LLM world subagent instructions for weather', async () => {
    const orchestrator = new SubagentOrchestratorService(repo, memoryService, mockLLMProvider, 'test-model');

    const weatherRes = await orchestrator.executeSubagentInstruction(testSessionId, 'world', 'Зміни погоду на зливу');
    expect(weatherRes.success).toBe(true);
    expect(weatherRes.message).toContain('downpour');
  });

  it('should compress session context according to 80/20 rule', async () => {
    const loopRepo = repo.getAgenticLoopRepository();
    // Seed 5 short logs
    for (let i = 1; i <= 5; i++) {
      loopRepo.saveShortLog(testSessionId, i, `Подія ходу ${i}`);
    }

    const compression = new CompressionService(repo);
    const result = await compression.compressSessionContext(testSessionId, true);

    expect(result.success).toBe(true);
    expect(result.compressedLogsCount).toBe(5);

    const uncompressed = loopRepo.getUncompressedShortLogs(testSessionId);
    expect(uncompressed.length).toBe(0);
  });
});
