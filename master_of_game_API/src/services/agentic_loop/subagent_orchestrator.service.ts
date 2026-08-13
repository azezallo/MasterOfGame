import { DatabaseRepository } from '../../persistence/database_repository';
import { SubagentGroup, SubagentExecutionResult } from '../../types/agentic_loop.types';
import { SemanticMemoryService } from '../semantic_memory.service';
import { ILLMProvider } from '../../providers/llm/llm_provider.interface';
import { LLMToolDefinition, LLMMessage } from '../../types/ai.types';
import { NpcData } from '../../types/npc.types';
import { NpcSchema } from '../../schemas/npc.schema';
import { PropertyService } from '../property.service';
import { logger } from '../../logger';

/**
 * All tools available across subagents.
 * Classified into Primary (domain-specific) and Secondary/Auxiliary tools via system prompts.
 */
export const ALL_SUBAGENT_TOOLS: LLMToolDefinition[] = [
  // --- Inspection / Read Tools (Secondary for checking state before modifying) ---
  {
    type: 'function',
    function: {
      name: 'get_player_state',
      description: 'ДРУГОРЯДНИЙ/ІНСПЕКЦІЙНИЙ ІНСТРУМЕНТ: Повертає поточні показники гравця (мана, характеристики, фізичні/тілесні/психологічні стани) для оцінки перед змінами.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_property_profile',
      description: 'ДРУГОРЯДНИЙ/ІНСПЕКЦІЙНИЙ ІНСТРУМЕНТ: Повертає поточний стан майна гравця (монети, вміст кишень та рюкзака).',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_world_state',
      description: 'ДРУГОРЯДНИЙ/ІНСПЕКЦІЙНИЙ ІНСТРУМЕНТ: Повертає поточний стан світу (час доби, дата, історія погоди).',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_memory',
      description: 'ДРУГОРЯДНИЙ/ІНСПЕКЦІЙНИЙ ІНСТРУМЕНТ: Пошук фактів та спогадів у Векторній БД F017.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Пошуковий запит' },
        },
        required: ['query'],
      },
    },
  },

  // --- Mutation / Write Tools ---
  {
    type: 'function',
    function: {
      name: 'update_player_state',
      description: 'ОСНОВНИЙ ІНСТРУМЕНТ ACTOR: Оновлює ману, HP, характеристики та будь-які фізичні, тілесні або психологічні стани гравця.',
      parameters: {
        type: 'object',
        properties: {
          add_physical_states: {
            type: 'array',
            items: { type: 'string' },
            description: 'Нові фізичні ефекти (напр. ["Тяжке виснаження", "Глибоке поранення"])',
          },
          remove_physical_states: {
            type: 'array',
            items: { type: 'string' },
            description: 'Фізичні ефекти для видалення (напр. ["виснаження"])',
          },
          add_body_states: {
            type: 'array',
            items: { type: 'string' },
            description: 'Тілесні стани для додавання (напр. ["Опік лівої руки"])',
          },
          remove_body_states: {
            type: 'array',
            items: { type: 'string' },
            description: 'Тілесні стани для видалення',
          },
          add_psychological_states: {
            type: 'array',
            items: { type: 'string' },
            description: 'Психологічні стани для додавання (напр. ["Шок", "Панічний страх"])',
          },
          remove_psychological_states: {
            type: 'array',
            items: { type: 'string' },
            description: 'Психологічні стани для видалення',
          },
          mana_delta: {
            type: 'number',
            description: 'Абсолютна зміна мани (напр. -15 для зняття 15 мани, +30 для відновлення)',
          },
          mana_percent: {
            type: 'number',
            description: 'Відсоткова зміна мани (напр. -50 якщо треба зняти половину/50% мани)',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_or_update_npc',
      description: 'ОСНОВНИЙ ІНСТРУМЕНТ ACTOR: Створює нового NPC або оновлює існуючого у локації.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Повне ім\'я NPC' },
          role: { type: 'string', description: 'Роль або професія NPC' },
          appearance: { type: 'string', description: 'Зовнішній вигляд NPC' },
          description: { type: 'string', description: 'Публічний опис NPC' },
          status: { type: 'string', description: 'Статус (alive, wounded, dead)' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_property_finances_and_items',
      description: 'ОСНОВНИЙ ІНСТРУМЕНТ PROPERTY: Додавання/списання монет та управління предметами інвентарю/рюкзака.',
      parameters: {
        type: 'object',
        properties: {
          coins_delta: {
            type: 'number',
            description: 'Зміна монет (позитивне число для нарахування, негативне для витрат)',
          },
          add_item_name: {
            type: 'string',
            description: 'Назва нового предмета для інвентарю',
          },
          remove_item_name: {
            type: 'string',
            description: 'Назва предмета для видалення з інвентарю',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_world_environment',
      description: 'ОСНОВНИЙ ІНСТРУМЕНТ WORLD: Зміна погоди, клімату та часу доби у світі.',
      parameters: {
        type: 'object',
        properties: {
          weather_type: {
            type: 'string',
            description: 'Тип погоди (downpour, thunderstorm, fog, clear, rain, blizzard, solar_flare)',
          },
          weather_intensity: {
            type: 'number',
            description: 'Інтенсивність погоди від 0 до 100',
          },
          time_of_day: {
            type: 'string',
            description: 'Час доби (morning, day, evening, night)',
          },
        },
      },
    },
  },
];

export class SubagentOrchestratorService {
  private repo: DatabaseRepository;
  private memoryService?: SemanticMemoryService;
  private llmProvider?: ILLMProvider;
  private modelName?: string;

  constructor(
    repo: DatabaseRepository,
    memoryService?: SemanticMemoryService,
    llmProvider?: ILLMProvider,
    modelName?: string
  ) {
    this.repo = repo;
    this.memoryService = memoryService;
    this.llmProvider = llmProvider;
    this.modelName = modelName;
  }

  public async executeSubagentInstruction(
    sessionId: string,
    subagentGroup: SubagentGroup,
    instruction: string
  ): Promise<SubagentExecutionResult> {
    logger.subagent('Pure LLM Subagent Execution Started', { subagentGroup, instruction });

    try {
      if (this.llmProvider && this.modelName) {
        const llmResult = await this.executeViaLLM(sessionId, subagentGroup, instruction);
        if (llmResult) {
          logger.subagent('Pure LLM Subagent Execution Completed', { subagentGroup, resultMessage: llmResult.message });
          return llmResult;
        }
      }

      // Fallback for direct testing or mock environments
      return await this.executeFallback(sessionId, subagentGroup, instruction);
    } catch (err: any) {
      logger.error('Subagent Execution Failed', { subagentGroup, error: err.message });
      return {
        success: false,
        message: `Помилка виконання інструкції сабагента: ${err.message}`,
      };
    }
  }

  private isInspectionTool(fnName: string): boolean {
    return ['get_player_state', 'get_property_profile', 'get_world_state', 'search_memory'].includes(fnName);
  }

  private getGroupSystemPrompt(subagentGroup: SubagentGroup): string {
    if (subagentGroup === 'actor') {
      return `Ви — Спеціалізований Сабагент Сутностей та Показників (ACTOR).
ВАШІ ОСНОВНІ ІНСТРУМЕНТИ: 'update_player_state', 'create_or_update_npc'.
ВАШІ ДРУГОРЯДНІ/ІНСПЕКЦІЙНИЙ ІНСТРУМЕНТИ: 'get_player_state', 'get_property_profile', 'get_world_state', 'search_memory'.

ПРАВИЛА РОБОТИ:
1. Якщо для виконання завдання потрібно спочатку перевірити поточні показники (наприклад, скільки мани зараз є у гравця), викликайте інспекційний інструмент 'get_player_state'.
2. Після отримання даних або для безпосереднього внесення змін ОБОРОТНО викликайте ваш основний інструмент 'update_player_state' чи 'create_or_update_npc'.
3. НЕ обмежуйтеся лише інспекцією, обов'язково виконайте підсумкову зміну стану!`;
    }

    if (subagentGroup === 'property') {
      return `Ви — Спеціалізований Сабагент Майна та Інвентарю (PROPERTY).
ВАШ ОСНОВНИЙ ІНСТРУМЕНТ: 'update_property_finances_and_items'.
ВАШІ ДРУГОРЯДНІ/ІНСПЕКЦІЙНИЙ ІНСТРУМЕНТИ: 'get_property_profile', 'get_player_state', 'search_memory'.

ПРАВИЛА РОБОТИ:
1. За потреби використовуйте 'get_property_profile' для інспекції інвентарю/монет.
2. Для внесення змін викликайте ваш основний інструмент 'update_property_finances_and_items'.`;
    }

    return `Ви — Спеціалізований Сабагент Світу та Погоди (WORLD).
ВАШ ОСНОВНИЙ ІНСТРУМЕНТ: 'update_world_environment'.
ВАШІ ДРУГОРЯДНІ/ІНСПЕКЦІЙНИЙ ІНСТРУМЕНТИ: 'get_world_state', 'search_memory'.

ПРАВИЛА РОБОТИ:
1. За потреби використовуйте 'get_world_state' для перевірки часу/погоди.
2. Для внесення змін викликайте ваш основний інструмент 'update_world_environment'.`;
  }

  private async executeViaLLM(
    sessionId: string,
    subagentGroup: SubagentGroup,
    instruction: string
  ): Promise<SubagentExecutionResult | null> {
    if (!this.llmProvider || !this.modelName) return null;

    const systemPrompt = this.getGroupSystemPrompt(subagentGroup);
    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: instruction },
    ];

    let lastResult: SubagentExecutionResult | null = null;

    // Multi-turn Re-Act Subagent Loop (up to 3 turns)
    for (let turn = 1; turn <= 3; turn++) {
      const res = await this.llmProvider.generate({
        model: this.modelName,
        messages,
        tools: ALL_SUBAGENT_TOOLS,
        toolChoice: 'auto',
        temperature: 0.1,
        timeoutMs: 0,
      });

      if (res.toolCalls && res.toolCalls.length > 0) {
        const toolCall = res.toolCalls[0];
        const fnName = toolCall.function.name;
        const args = typeof toolCall.function.arguments === 'string'
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function.arguments;

        logger.subagent('Subagent LLM Called Tool', { turn, fnName, args });
        const toolResult = await this.dispatchToolCall(sessionId, fnName, args);

        // If subagent called a read/inspection tool, feed the result back into history and continue loop!
        if (this.isInspectionTool(fnName)) {
          messages.push({
            role: 'assistant',
            content: null,
            tool_calls: [toolCall],
          });
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: fnName,
            content: JSON.stringify(toolResult.data || toolResult.message),
          });
          lastResult = toolResult;
          continue;
        }

        // Mutation tool executed!
        return toolResult;
      }

      // Fallback JSON parsing
      if (res.content) {
        try {
          const jsonMatch = res.content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.tool || parsed.function) {
              const fnName = parsed.tool || parsed.function;
              const args = parsed.args || parsed.parameters || {};
              const toolResult = await this.dispatchToolCall(sessionId, fnName, args);
              if (!this.isInspectionTool(fnName)) {
                return toolResult;
              }
              lastResult = toolResult;
            }
          }
        } catch {}
      }

      if (turn > 1 && lastResult) {
        return lastResult;
      }
    }

    return lastResult;
  }

  private async dispatchToolCall(sessionId: string, fnName: string, args: Record<string, any>): Promise<SubagentExecutionResult> {
    switch (fnName) {
      // --- Read / Inspection Tools ---
      case 'get_player_state': {
        const playerRepo = this.repo.getPlayerStateRepository();
        const playerState = playerRepo.getPlayerState(sessionId);
        return {
          success: true,
          message: `Поточні показники гравця: Мана ${playerState.magic_stats?.current_mana || 25}/${playerState.magic_stats?.mana_pool || 100}`,
          data: { playerState },
        };
      }

      case 'get_property_profile': {
        const propertyRepo = this.repo.getPropertyRepository();
        const profile = propertyRepo.getPropertyProfile('player', sessionId);
        return {
          success: true,
          message: `Поточне майно гравця: Монети ${profile?.finances?.coins || 0}`,
          data: { profile },
        };
      }

      case 'get_world_state': {
        const worldRepo = this.repo.getWorldStateRepository();
        const worldTime = worldRepo.getTimeAndWeather();
        return {
          success: true,
          message: `Поточний стан світу`,
          data: { worldTime },
        };
      }

      case 'search_memory': {
        if (this.memoryService && args.query) {
          const memoryResults = this.memoryService.searchMemory({
            session_id: sessionId,
            query: args.query,
            limit: 3,
          });
          return {
            success: true,
            message: `Семантичний пошук F017: знайдено ${memoryResults.length} записів`,
            data: memoryResults,
          };
        }
        return {
          success: true,
          message: `Пошук у пам'яті завершено (0 записів)`,
          data: [],
        };
      }

      // --- Mutation / Write Tools ---
      case 'update_player_state': {
        const playerRepo = this.repo.getPlayerStateRepository();
        const playerState = playerRepo.getPlayerState(sessionId);

        if (!playerState.physical_states) playerState.physical_states = [];
        if (!playerState.body_states) playerState.body_states = [];
        if (!playerState.psychological_states) playerState.psychological_states = [];

        // Add / remove physical states
        if (args.add_physical_states && Array.isArray(args.add_physical_states)) {
          for (const sName of args.add_physical_states) {
            if (!playerState.physical_states.some((s) => s.name.toLowerCase() === sName.toLowerCase())) {
              playerState.physical_states.push({ name: sName, timestamp: new Date().toISOString() });
            }
          }
        }
        if (args.remove_physical_states && Array.isArray(args.remove_physical_states)) {
          playerState.physical_states = playerState.physical_states.filter(
            (s) => !args.remove_physical_states.some((r: string) => r.toLowerCase() === s.name.toLowerCase())
          );
        }

        // Add / remove body states
        if (args.add_body_states && Array.isArray(args.add_body_states)) {
          for (const sName of args.add_body_states) {
            if (!playerState.body_states.some((s) => s.name.toLowerCase() === sName.toLowerCase())) {
              playerState.body_states.push({ name: sName, timestamp: new Date().toISOString() });
            }
          }
        }
        if (args.remove_body_states && Array.isArray(args.remove_body_states)) {
          playerState.body_states = playerState.body_states.filter(
            (s) => !args.remove_body_states.some((r: string) => r.toLowerCase() === s.name.toLowerCase())
          );
        }

        // Add / remove psychological states
        if (args.add_psychological_states && Array.isArray(args.add_psychological_states)) {
          for (const sName of args.add_psychological_states) {
            if (!playerState.psychological_states.some((s) => s.name.toLowerCase() === sName.toLowerCase())) {
              playerState.psychological_states.push({ name: sName, timestamp: new Date().toISOString() });
            }
          }
        }
        if (args.remove_psychological_states && Array.isArray(args.remove_psychological_states)) {
          playerState.psychological_states = playerState.psychological_states.filter(
            (s) => !args.remove_psychological_states.some((r: string) => r.toLowerCase() === s.name.toLowerCase())
          );
        }

        // Mana adjustment (percentage or absolute delta)
        if (!playerState.magic_stats) {
          playerState.magic_stats = { current_mana: 25, mana_pool: 100, mana_flow: 5, base_regen: 10.0 };
        }
        const currentMana = playerState.magic_stats.current_mana ?? 25;
        const maxMana = playerState.magic_stats.mana_pool ?? 100;

        if (typeof args.mana_percent === 'number') {
          const factor = 1 + (args.mana_percent / 100);
          playerState.magic_stats.current_mana = Math.max(0, Math.min(maxMana, Math.round(currentMana * factor)));
        } else if (typeof args.mana_delta === 'number') {
          playerState.magic_stats.current_mana = Math.max(0, Math.min(maxMana, currentMana + args.mana_delta));
        }

        playerRepo.savePlayerState(sessionId, playerState);

        return {
          success: true,
          message: `Стан гравця успішно оновлено через ШІ-сабагента (Мана: ${playerState.magic_stats.current_mana}/${maxMana})`,
          data: { playerState },
        };
      }

      case 'create_or_update_npc': {
        const npcRepo = this.repo.getNpcRepository();
        const npcId = `npc_${Date.now()}`;
        const newNpc: NpcData = NpcSchema.parse({
          npc_id: npcId,
          status: args.status || 'alive',
          created_at: Math.floor(Date.now() / 1000),
          updated_at: Math.floor(Date.now() / 1000),
          public_profile: {
            name: args.name,
            role: args.role || 'trader',
            appearance: args.appearance || 'Описаний Майстром',
            public_description: args.description || 'Створений ШІ-сабагентом',
          },
          private_profile: {
            current_status: { relationship_to_player: 'neutral', mood: 'calm', current_goal: 'Спостереження' },
            drivers: { primary_goals: [], critical_fears: [] },
            traits: { social_style: 'доброзичливий', moral_alignment: 'нейтральний', resilience: 'середній' },
            attachments: { organization_loyalty: '', family_loyalty: '', core_values: '' },
          },
          spatial_presence: { current_location_id: args.location_id || 'default_loc', default_routine: [], override_event: null },
          knowledge: {
            world_perception: { description: '', dynamic_updates: [] },
            subjective_thoughts: { player_evaluation: '', mood_impact: '', topics_discussed: [] },
            hidden_memory: { secrets: [], memory_summary: '', events: [] },
            player_notes: { content: '', last_updated: 0 },
          },
          organizations: [],
          relationships: [],
        });

        npcRepo.save(newNpc);
        return {
          success: true,
          message: `ШІ-сабагент успішно створив NPC "${args.name}"`,
          data: { npc: newNpc },
        };
      }

      case 'update_property_finances_and_items': {
        const propertyRepo = this.repo.getPropertyRepository();
        let profile = propertyRepo.getPropertyProfile('player', sessionId);
        if (!profile) {
          profile = {
            property_profile_id: `prop_${sessionId}`,
            owner_context: { owner_type: 'player', owner_id: sessionId },
            equipped: [],
            pocket_inventory: {
              backpack: { is_equipped: true, backpack_item_id: null, items: [] },
              pockets_and_belt: { items: [] },
              weight_stats: { equipped_and_pockets_weight_kg: 0, backpack_weight_kg: 0, total_weight_kg: 0, max_carry_weight_kg: 30.0, encumbrance_status: 'normal', combat_encumbrance_status: 'normal' },
            },
            finances: { coins: 100, bank_accounts: [], promissory_notes: [] },
            real_estate: [], storage_caches: [], vehicles_and_mounts: [],
            created_at: Math.floor(Date.now() / 1000), updated_at: Math.floor(Date.now() / 1000),
          };
        }

        if (typeof args.coins_delta === 'number') {
          const currentCoins = profile.finances?.coins ?? 100;
          profile.finances.coins = Math.max(0, currentCoins + args.coins_delta);
        }

        if (args.add_item_name) {
          const itemId = `item_${Date.now()}`;
          this.repo.saveItem({ itemId, quantity: 1, metadata: { name: args.add_item_name, category: 'misc' } });
          if (!profile.pocket_inventory.pockets_and_belt.items) {
            profile.pocket_inventory.pockets_and_belt.items = [];
          }
          profile.pocket_inventory.pockets_and_belt.items.push({ item_id: itemId, quantity: 1 });
        }

        const propService = new PropertyService(
          propertyRepo,
          this.repo.getItemRepository(),
          this.repo.getPlayerStateRepository()
        );
        profile = propService.recalculateWeightStats(profile);
        propertyRepo.savePropertyProfile(profile);

        return {
          success: true,
          message: `Майно гравця успішно оновлено через ШІ-сабагента`,
          data: { property: profile },
        };
      }

      case 'update_world_environment': {
        const worldRepo = this.repo.getWorldStateRepository();
        const existing = worldRepo.getTimeAndWeather() || { current_date: new Date().toISOString(), weather_timeline: [] };
        const weatherType = args.weather_type || 'rain';
        const updatedTimeline = [
          { weather_type: weatherType, intensity: args.weather_intensity ?? 80, timestamp: new Date().toISOString() },
          ...(existing.weather_timeline || []),
        ];
        worldRepo.saveTimeAndWeather(existing.current_date, updatedTimeline);
        return {
          success: true,
          message: `Стан світу оновлено через ШІ-сабагента (Погода: ${weatherType})`,
          data: { weatherType, weatherTimeline: updatedTimeline },
        };
      }
    }

    return {
      success: true,
      message: `ШІ-сабагент обробив інструкцію`,
    };
  }

  private async executeFallback(
    sessionId: string,
    subagentGroup: SubagentGroup,
    instruction: string
  ): Promise<SubagentExecutionResult> {
    const lower = instruction.toLowerCase();

    if (subagentGroup === 'actor') {
      const playerRepo = this.repo.getPlayerStateRepository();
      const playerState = playerRepo.getPlayerState(sessionId);

      if (lower.includes('виснаження') || lower.includes('ефект') || lower.includes('стан')) {
        let effectName = 'exhaustion';
        const effectMatch = instruction.match(/["'«]([^"'»]+)["'»]/);
        if (effectMatch && effectMatch[1]) effectName = effectMatch[1].trim();

        if (!playerState.physical_states) playerState.physical_states = [];
        if (!playerState.physical_states.some((s) => s.name.toLowerCase() === effectName.toLowerCase())) {
          playerState.physical_states.push({ name: effectName, timestamp: new Date().toISOString() });
          playerRepo.savePlayerState(sessionId, playerState);
        }
      }

      return {
        success: true,
        message: `Сабагент ${subagentGroup.toUpperCase()} опрацював інструкцію: "${instruction}"`,
        data: { playerState },
      };
    }

    if (subagentGroup === 'property') {
      const propertyRepo = this.repo.getPropertyRepository();
      const profile = propertyRepo.getPropertyProfile('player', sessionId);
      return {
        success: true,
        message: `Сабагент ${subagentGroup.toUpperCase()} опрацював інструкцію: "${instruction}"`,
        data: { property: profile },
      };
    }

    const worldRepo = this.repo.getWorldStateRepository();
    const worldTime = worldRepo.getTimeAndWeather();
    return {
      success: true,
      message: `Сабагент ${subagentGroup.toUpperCase()} опрацював інструкцію: "${instruction}"`,
      data: { worldTime },
    };
  }
}
