import { DatabaseRepository } from '../../persistence/database_repository';
import { SubagentGroup, SubagentExecutionResult } from '../../types/agentic_loop.types';
import { SemanticMemoryService } from '../semantic_memory.service';
import { ILLMProvider } from '../../providers/llm/llm_provider.interface';
import { LLMToolDefinition, LLMMessage } from '../../types/ai.types';
import { NpcData } from '../../types/npc.types';
import { NpcSchema } from '../../schemas/npc.schema';
import { PropertyService } from '../property.service';
import { WorldStateService } from '../world_state.service';
import { PlayerStateService } from '../player_state.service';
import { OrganizationRepository } from '../../repositories/organization.repository';
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
      description: 'ДРУГОРЯДНИЙ/ІНСПЕКЦІЙНИЙ ІНСТРУМЕНТ: Повертає поточні показники гравця (мана, характеристики, навички, фізичні/тілесні/психологічні стани) для оцінки перед змінами.',
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
      description: 'ДРУГОРЯДНИЙ/ІНСПЕКЦІЙНИЙ ІНСТРУМЕНТ: Повертає поточний стан майна сутності (гравця чи NPC: монети, вміст кишень та рюкзака).',
      parameters: {
        type: 'object',
        properties: {
          owner_type: { type: 'string', description: 'Тип власника (player або npc)' },
          owner_name: { type: 'string', description: 'Ім\'я NPC якщо шукаємо майно персонажа' },
        },
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
      name: 'get_npc_dossier',
      description: 'ДРУГОРЯДНИЙ/ІНСПЕКЦІЙНИЙ ІНСТРУМЕНТ: Отримання досьє та поточного стану NPC за ім\'ям чи ID.',
      parameters: {
        type: 'object',
        properties: {
          npc_id: { type: 'string', description: 'Унікальний ID NPC' },
          name: { type: 'string', description: 'Ім\'я NPC для пошуку' },
        },
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
      description: 'ОСНОВНИЙ ІНСТРУМЕНТ ACTOR: Оновлює ману, HP, навички, атрибути та будь-які фізичні, тілесні або психологічні стани гравця.',
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
          update_skills: {
            type: 'array',
            description: 'Масив оновлення навичок (напр. [{"name": "Магія вогню", "value": 60}, {"name": "Володіння пікою", "value": 45}])',
          },
          skill_name: {
            type: 'string',
            description: 'Назва окремої навички природною мовою для зміни чи додавання (напр. "Магія вогню", "Володіння пікою")',
          },
          skill_value: {
            type: 'number',
            description: 'Нове абсолютне значення навички від 0 до 100',
          },
          skill_delta: {
            type: 'number',
            description: 'Зміна значення навички (напр. +10 або -5)',
          },
          update_attributes: {
            type: 'object',
            description: 'Об\'єкт оновлення атрибутів (напр. {"strength": 30, "agility": 25})',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_or_update_npc',
      description: 'ОСНОВНИЙ ІНСТРУМЕНТ ACTOR: Створює нового NPC або оновлює існуючого (профіль, таємниці у secrets, ставлення та соціальні зв\'язки).',
      parameters: {
        type: 'object',
        properties: {
          npc_id: { type: 'string', description: 'ID NPC для точного оновлення (необов\'язково)' },
          name: { type: 'string', description: 'Повне ім\'я NPC' },
          role: { type: 'string', description: 'Роль або професія NPC' },
          appearance: { type: 'string', description: 'Зовнішній вигляд NPC' },
          description: { type: 'string', description: 'Публічний опис NPC' },
          status: { type: 'string', description: 'Статус (alive, wounded, dead)' },
          location_id: { type: 'string', description: 'Локація перебування NPC' },

          // Secrets parameters (Recorded in hidden_memory.secrets)
          secret_description: { type: 'string', description: 'Прихована таємниця NPC для запису у приватне поле hidden_memory.secrets' },
          secret_discovery_status: { type: 'string', description: 'Статус таємниці (hidden, discovered_by_player)' },

          // Social & Status parameters
          relationship_to_player: { type: 'string', description: 'Ставлення до гравця (friendly, hostile, neutral, loyal, suspicious)' },
          mood: { type: 'string', description: 'Емоційний стан NPC (calm, angry, fearful, excited)' },
          current_goal: { type: 'string', description: 'Поточна мета NPC' },

          // Inter-NPC Relationship parameters
          target_name: { type: 'string', description: 'Ім\'я іншого NPC для створення соціального зв\'язку' },
          target_npc_id: { type: 'string', description: 'ID іншого NPC для соціального зв\'язку' },
          relationship_type: { type: 'string', description: 'Тип зв\'язку між персонажами (ally, rival, family, enemy, acquaintance)' },
          relationship_summary: { type: 'string', description: 'Короткий опис зв\'язку між персонажами' },
          relationship_strength: { type: 'number', description: 'Сила зв\'язку (від -1.0 до 1.0)' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_npc_secret',
      description: 'ОСНОВНИЙ ІНСТРУМЕНТ ACTOR: Додавання нової прихованої таємниці у приватну пам\'ять NPC або її розкриття для гравця.',
      parameters: {
        type: 'object',
        properties: {
          npc_id: { type: 'string', description: 'ID NPC' },
          name: { type: 'string', description: 'Ім\'я NPC' },
          secret_id: { type: 'string', description: 'Технічний ID таємниці (для розкриття)' },
          secret_description: { type: 'string', description: 'Текст прихованої таємниці' },
          discovery_status: { type: 'string', description: 'Статус (hidden, discovered_by_player)' },
          action: { type: 'string', description: 'Дія: add (додати нову) або reveal (розкрити гравцю)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_npc_relationship',
      description: 'ОСНОВНИЙ ІНСТРУМЕНТ ACTOR: Зміна ставлення NPC до гравця або встановлення соціальних зв\'язків з іншим персонажем.',
      parameters: {
        type: 'object',
        properties: {
          npc_id: { type: 'string', description: 'ID NPC' },
          name: { type: 'string', description: 'Ім\'я NPC' },
          relationship_to_player: { type: 'string', description: 'Ставлення до гравця (friendly, hostile, neutral, loyal, suspicious)' },
          mood: { type: 'string', description: 'Настрій NPC (calm, angry, fearful)' },
          target_name: { type: 'string', description: 'Ім\'я іншого NPC для зв\'язку' },
          target_npc_id: { type: 'string', description: 'ID іншого NPC для зв\'язку' },
          relationship_type: { type: 'string', description: 'Тип зв\'язку (ally, rival, family, enemy, acquaintance)' },
          strength: { type: 'number', description: 'Сила відносин (-1.0 до 1.0)' },
          summary: { type: 'string', description: 'Опис відносин між персонажами' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_npc_memory_event',
      description: 'ОСНОВНИЙ ІНСТРУМЕНТ ACTOR: Запис нової пережитої події або спогаду у приватну пам\'ять NPC.',
      parameters: {
        type: 'object',
        properties: {
          npc_id: { type: 'string', description: 'ID NPC' },
          name: { type: 'string', description: 'Ім\'я NPC' },
          event_description: { type: 'string', description: 'Опис пережитої події' },
          source_type: { type: 'string', description: 'Джерело спогаду (direct_interaction, rumor, witnessed)' },
        },
        required: ['event_description'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_property_finances_and_items',
      description: 'ОСНОВНИЙ ІНСТРУМЕНТ PROPERTY: Додавання/списання монет та додавання/видалення предметів з інвентарю сутності (гравця чи NPC).',
      parameters: {
        type: 'object',
        properties: {
          owner_type: { type: 'string', description: 'Власник майна (player або npc)' },
          owner_name: { type: 'string', description: 'Ім\'я NPC якщо оновлюємо майно персонажа' },
          coins_delta: {
            type: 'number',
            description: 'Зміна монет (позитивне число для нарахування, негативне для витрат)',
          },
          coins_set: {
            type: 'number',
            description: 'Встановлення точної кількості монет',
          },
          add_item_name: {
            type: 'string',
            description: 'Назва нового предмета для додавання в інвентар',
          },
          item_category: {
            type: 'string',
            description: 'Категорія предмета (weapon, potion, armor, key, document, misc)',
          },
          remove_item_name: {
            type: 'string',
            description: 'Назва предмета для вилучення/видалення з інвентарю',
          },
          quantity: {
            type: 'number',
            description: 'Кількість предмета (за замовчуванням 1)',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_world_environment',
      description: 'ОСНОВНИЙ ІНСТРУМЕНТ WORLD: Зміна погоди, клімату, часу доби, небесних явищ та подій у світі.',
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
          advance_hours: {
            type: 'number',
            description: 'Просування часу вперед на вказану кількість годин',
          },
          advance_days: {
            type: 'number',
            description: 'Просування часу вперед на вказану кількість днів',
          },
          event_action: {
            type: 'string',
            description: 'Дія над подіями світу (create, update, resolve)',
          },
          event_title: {
            type: 'string',
            description: 'Назва світової події',
          },
          event_description: {
            type: 'string',
            description: 'Опис події світу',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_organization_reputation',
      description: 'ОСНОВНИЙ ІНСТРУМЕНТ WORLD/ACTOR: Зміна репутації гравця у фракції чи організації або відкриття таємної організації.',
      parameters: {
        type: 'object',
        properties: {
          organization_id: { type: 'string', description: 'ID організації (напр. org_city_guard, org_thieves_guild, org_merchant_guild)' },
          organization_name: { type: 'string', description: 'Назва організації для пошуку (напр. "Міська варта", "Гільдія злодіїв")' },
          reputation_delta: { type: 'number', description: 'Зміна репутації (від -100 до +100)' },
          rank_id: { type: 'string', description: 'Новий ранг у фракції' },
          description: { type: 'string', description: 'Опис події взаємодії' },
          is_known_to_player: { type: 'boolean', description: 'Чи стала організація відомою гравцеві' },
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
    instruction: string,
    onProgress?: (data: { subagent: SubagentGroup; message: string }) => void
  ): Promise<SubagentExecutionResult> {
    logger.subagent('Pure LLM Subagent Execution Started', { subagentGroup, instruction });

    try {
      if (this.llmProvider && this.modelName) {
        const llmResult = await this.executeViaLLM(sessionId, subagentGroup, instruction, onProgress);
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
    return ['get_player_state', 'get_property_profile', 'get_world_state', 'get_npc_dossier', 'search_memory'].includes(fnName);
  }

  private getGroupSystemPrompt(subagentGroup: SubagentGroup): string {
    if (subagentGroup === 'actor') {
      return `Ви — Спеціалізований Сабагент Сутностей, Показників, NPC та Навичок (ACTOR).
ВАШІ ОСНОВНІ ІНСТРУМЕНТИ: 'update_player_state', 'create_or_update_npc', 'update_npc_secret', 'update_npc_relationship', 'add_npc_memory_event', 'update_organization_reputation'.
ВАШІ ДРУГОРЯДНІ/ІНСПЕКЦІЙНІ ІНСТРУМЕНТИ: 'get_player_state', 'get_npc_dossier', 'get_property_profile', 'get_world_state', 'search_memory'.

ПРАВИЛА РОБОТИ:
1. Для додавання або відкриття прихованої таємниці NPC використовуйте спеціальне поле 'secret_description' в 'create_or_update_npc' або тул 'update_npc_secret'. НЕ записуйте приховані таємниці у звичайний публічний опис 'description'!
2. Для оновлення ставлення до гравця використовуйте поле 'relationship_to_player' або тул 'update_npc_relationship'. Для відношень між персонажами використовуйте 'target_name' та 'relationship_type'.
3. Для підняття навичок ('update_skills'), мани чи характеристик використовуйте 'update_player_state'.
4. НЕ обмежуйтеся лише інспекцією, обов'язково виконайте підсумкову зміну стану!`;
    }

    if (subagentGroup === 'property') {
      return `Ви — Спеціалізований Сабагент Майна та Інвентарю (PROPERTY).
ВАШ ОСНОВНИЙ ІНСТРУМЕНТ: 'update_property_finances_and_items'.
ВАШІ ДРУГОРЯДНІ/ІНСПЕКЦІЙНІ ІНСТРУМЕНТИ: 'get_property_profile', 'get_player_state', 'search_memory'.

ПРАВИЛА РОБОТИ:
1. За потреби використовуйте 'get_property_profile' для інспекції інвентарю/монет.
2. Для додавання або ВИДАЛЕННЯ предметів та монет у гравця чи NPC викликайте ваш основний інструмент 'update_property_finances_and_items'.`;
    }

    return `Ви — Спеціалізований Сабагент Світу та Погоди (WORLD).
ВАШІ ОСНОВНІ ІНСТРУМЕНТИ: 'update_world_environment', 'update_organization_reputation'.
ВАШІ ДРУГОРЯДНІ/ІНСПЕКЦІЙНІ ІНСТРУМЕНТИ: 'get_world_state', 'search_memory'.

ПРАВИЛА РОБОТИ:
1. За потреби використовуйте 'get_world_state' для перевірки часу/погоди.
2. Для внесення змін викликайте ваш основний інструмент 'update_world_environment' або 'update_organization_reputation'.`;
  }

  private async executeViaLLM(
    sessionId: string,
    subagentGroup: SubagentGroup,
    instruction: string,
    onProgress?: (data: { subagent: SubagentGroup; message: string }) => void
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
        if (onProgress) {
          onProgress({
            subagent: subagentGroup,
            message: `Сабагент ${subagentGroup.toUpperCase()} опрацьовує ${fnName}...`,
          });
        }
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
          const parsed = JSON.parse(res.content);
          if (parsed.tool_name && parsed.arguments) {
            if (onProgress) {
              onProgress({
                subagent: subagentGroup,
                message: `Сабагент ${subagentGroup.toUpperCase()} опрацьовує ${parsed.tool_name}...`,
              });
            }
            const toolResult = await this.dispatchToolCall(sessionId, parsed.tool_name, parsed.arguments);
            return toolResult;
          }
        } catch {}
      }

      if (lastResult) return lastResult;
    }

    return null;
  }

  private async dispatchToolCall(
    sessionId: string,
    toolName: string,
    args: any
  ): Promise<SubagentExecutionResult> {
    logger.subagent('Dispatching Subagent Tool Call', { toolName, args });

    switch (toolName) {
      // --- Inspection / Read Tools ---
      case 'get_player_state': {
        const playerRepo = this.repo.getPlayerStateRepository();
        const state = playerRepo.getPlayerState(sessionId);
        return {
          success: true,
          message: `Отримано стан гравця`,
          data: state,
        };
      }

      case 'get_property_profile': {
        const propertyRepo = this.repo.getPropertyRepository();
        let ownerType = args.owner_type || 'player';
        let ownerId = args.owner_id || sessionId;
        if (ownerType === 'npc' && args.owner_name) {
          const npcRepo = this.repo.getNpcRepository();
          const matches = npcRepo.search(args.owner_name);
          if (matches.length > 0) ownerId = matches[0].npc_id;
        }
        const profile = propertyRepo.getPropertyProfile(ownerType, ownerId);
        return {
          success: true,
          message: `Отримано майно для ${ownerType}:${ownerId}`,
          data: profile,
        };
      }

      case 'get_world_state': {
        const worldRepo = this.repo.getWorldStateRepository();
        const playerStateRepo = this.repo.getPlayerStateRepository();
        const worldService = new WorldStateService(worldRepo, playerStateRepo);
        const worldState = worldService.getWorldState();
        return {
          success: true,
          message: `Отримано стан світу`,
          data: worldState,
        };
      }

      case 'get_npc_dossier': {
        const npcRepo = this.repo.getNpcRepository();
        let npc: NpcData | null = null;
        if (args.npc_id) {
          npc = npcRepo.findById(args.npc_id);
        }
        if (!npc && args.name) {
          const searchResults = npcRepo.search(args.name);
          if (searchResults.length > 0) {
            npc = searchResults[0];
          }
        }
        if (!npc) {
          return {
            success: false,
            message: `NPC "${args.name || args.npc_id}" не знайдено в базі даних`,
          };
        }
        return {
          success: true,
          message: `Досьє NPC "${npc.public_profile.name}" успішно завантажено`,
          data: npc,
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
        const worldRepo = this.repo.getWorldStateRepository();
        const propertyRepo = this.repo.getPropertyRepository();
        const propService = new PropertyService(
          propertyRepo,
          this.repo.getItemRepository(),
          playerRepo
        );
        const playerStateService = new PlayerStateService(playerRepo, propService, worldRepo);
        const playerState = playerStateService.updatePlayerState(sessionId, args);

        const currentMana = playerState.magic_stats?.current_mana ?? 25;
        const maxMana = playerState.magic_stats?.mana_pool ?? 100;
        const skillCount = Array.isArray(playerState.skills) ? playerState.skills.length : 0;

        return {
          success: true,
          message: `Стан гравця успішно оновлено через ШІ-сабагента (Мана: ${currentMana}/${maxMana}, Навички: ${skillCount})`,
          data: { playerState },
        };
      }

      case 'create_or_update_npc': {
        const npcRepo = this.repo.getNpcRepository();
        let existing: NpcData | null = null;

        if (args.npc_id) {
          existing = npcRepo.findById(args.npc_id);
        }
        if (!existing && args.name) {
          const searchResults = npcRepo.search(args.name);
          if (searchResults.length > 0) {
            existing = searchResults[0];
          }
        }

        const now = Math.floor(Date.now() / 1000);

        if (!existing) {
          const npcId = args.npc_id || `npc_${Date.now()}`;
          existing = NpcSchema.parse({
            npc_id: npcId,
            status: args.status || 'alive',
            created_at: now,
            updated_at: now,
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
        } else {
          existing.status = args.status || existing.status;
          existing.updated_at = now;
          if (args.name) existing.public_profile.name = args.name;
          if (args.role) existing.public_profile.role = args.role;
          if (args.appearance) existing.public_profile.appearance = args.appearance;
          if (args.description) existing.public_profile.public_description = args.description;
          if (args.location_id) existing.spatial_presence.current_location_id = args.location_id;
        }

        // 1. Secrets Handling (Recorded in hidden_memory.secrets)
        const secDesc = args.secret_description || args.secret;
        if (secDesc) {
          if (!existing.knowledge.hidden_memory.secrets) {
            existing.knowledge.hidden_memory.secrets = [];
          }
          existing.knowledge.hidden_memory.secrets.push({
            secret_id: args.secret_id || `sec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            description: secDesc,
            source: 'narrative',
            discovery_status: args.secret_discovery_status || 'discovered_by_player',
          });
        }

        // 2. Relationship to Player & Mood
        if (args.relationship_to_player) {
          existing.private_profile.current_status.relationship_to_player = args.relationship_to_player;
        }
        if (args.mood) {
          existing.private_profile.current_status.mood = args.mood;
        }
        if (args.current_goal) {
          existing.private_profile.current_status.current_goal = args.current_goal;
        }

        // 3. Inter-NPC Relationships
        let targetId = args.target_npc_id;
        let targetName = args.target_name;
        if (!targetId && targetName) {
          const tMatches = npcRepo.search(targetName);
          if (tMatches.length > 0) {
            targetId = tMatches[0].npc_id;
            targetName = tMatches[0].public_profile.name;
          }
        }
        if (!targetName && targetId) {
          const targetNpc = npcRepo.findById(targetId);
          if (targetNpc) targetName = targetNpc.public_profile.name;
        }

        if ((targetId || targetName) && args.relationship_type) {
          if (!existing.relationships) existing.relationships = [];
          const actualTargetId = targetId || `npc_rel_${Date.now()}`;
          const idx = existing.relationships.findIndex(r => r.target_npc_id === actualTargetId || (targetName && r.target_npc_name === targetName));
          const relObj = {
            target_npc_id: actualTargetId,
            target_npc_name: targetName || 'Персонаж',
            relationship_type: args.relationship_type,
            strength: typeof args.relationship_strength === 'number' ? args.relationship_strength : 0.5,
            summary: args.relationship_summary || `Відносини з ${targetName || actualTargetId}`,
            last_updated: now,
          };
          if (idx >= 0) existing.relationships[idx] = relObj;
          else existing.relationships.push(relObj);
        }

        npcRepo.save(existing);
        return {
          success: true,
          message: `ШІ-сабагент успішно зберіг NPC "${existing.public_profile.name}" (Таємниці: ${existing.knowledge.hidden_memory.secrets.length}, Відносини до гравця: ${existing.private_profile.current_status.relationship_to_player})`,
          data: { npc: existing },
        };
      }

      case 'update_npc_secret': {
        const npcRepo = this.repo.getNpcRepository();
        const nameOrId = args.npc_id || args.name;
        let npc = nameOrId ? (npcRepo.findById(nameOrId) || npcRepo.search(nameOrId)[0]) : null;
        if (!npc) {
          return { success: false, message: `NPC "${nameOrId}" не знайдено для додавання таємниці` };
        }
        if (!npc.knowledge.hidden_memory.secrets) {
          npc.knowledge.hidden_memory.secrets = [];
        }
        const secDesc = args.description || args.secret_description || args.secret;
        const secId = args.secret_id || `sec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

        if (args.action === 'reveal' && args.secret_id) {
          const sec = npc.knowledge.hidden_memory.secrets.find(s => s.secret_id === args.secret_id);
          if (sec) sec.discovery_status = 'discovered_by_player';
        } else {
          npc.knowledge.hidden_memory.secrets.push({
            secret_id: secId,
            description: secDesc || 'Таємниця додана ШІ-сабагентом',
            source: 'narrative',
            discovery_status: args.discovery_status || args.secret_discovery_status || 'discovered_by_player',
          });
        }
        npcRepo.save(npc);
        return {
          success: true,
          message: `Таємницю NPC "${npc.public_profile.name}" успішно оновлено у приватному полі secrets`,
          data: { npc },
        };
      }

      case 'update_npc_relationship': {
        const npcRepo = this.repo.getNpcRepository();
        const nameOrId = args.npc_id || args.name;
        let npc = nameOrId ? (npcRepo.findById(nameOrId) || npcRepo.search(nameOrId)[0]) : null;
        if (!npc) {
          return { success: false, message: `NPC "${nameOrId}" не знайдено для оновлення відносин` };
        }
        if (args.relationship_to_player) {
          npc.private_profile.current_status.relationship_to_player = args.relationship_to_player;
        }
        if (args.mood) {
          npc.private_profile.current_status.mood = args.mood;
        }

        let tId = args.target_npc_id;
        let tName = args.target_name;
        if (!tId && tName) {
          const tMatches = npcRepo.search(tName);
          if (tMatches.length > 0) {
            tId = tMatches[0].npc_id;
            tName = tMatches[0].public_profile.name;
          }
        }
        if (!tName && tId) {
          const targetNpc = npcRepo.findById(tId);
          if (targetNpc) tName = targetNpc.public_profile.name;
        }

        if ((tId || tName) && args.relationship_type) {
          if (!npc.relationships) npc.relationships = [];
          const now = Math.floor(Date.now() / 1000);
          const actualTargetId = tId || `npc_rel_${Date.now()}`;
          const idx = npc.relationships.findIndex(r => r.target_npc_id === actualTargetId || (tName && r.target_npc_name === tName));
          const relData = {
            target_npc_id: actualTargetId,
            target_npc_name: tName || 'Персонаж',
            relationship_type: args.relationship_type,
            strength: typeof args.strength === 'number' ? args.strength : (typeof args.relationship_strength === 'number' ? args.relationship_strength : 0.5),
            summary: args.summary || args.relationship_summary || `Відносини з ${tName || actualTargetId}`,
            last_updated: now,
          };
          if (idx >= 0) npc.relationships[idx] = relData;
          else npc.relationships.push(relData);
        }
        npcRepo.save(npc);
        return {
          success: true,
          message: `Соціальні зв'язки та ставлення NPC "${npc.public_profile.name}" успішно оновлено`,
          data: { npc },
        };
      }

      case 'add_npc_memory_event': {
        const npcRepo = this.repo.getNpcRepository();
        const nameOrId = args.npc_id || args.name;
        let npc = nameOrId ? (npcRepo.findById(nameOrId) || npcRepo.search(nameOrId)[0]) : null;
        if (!npc) {
          return { success: false, message: `NPC "${nameOrId}" не знайдено для додавання спогаду` };
        }
        if (!npc.knowledge.hidden_memory.events) {
          npc.knowledge.hidden_memory.events = [];
        }
        npc.knowledge.hidden_memory.events.push({
          timestamp: Math.floor(Date.now() / 1000),
          event_description: args.event_description,
          source_type: args.source_type || 'direct_interaction',
        });
        npcRepo.save(npc);
        return {
          success: true,
          message: `Спогад успішно додано у приватну пам'ять NPC "${npc.public_profile.name}"`,
          data: { npc },
        };
      }

      case 'update_property_finances_and_items': {
        const propertyRepo = this.repo.getPropertyRepository();
        let ownerType = args.owner_type || 'player';
        let ownerId = args.owner_id || sessionId;
        if (ownerType === 'npc' && (args.owner_name || args.npc_name)) {
          const npcRepo = this.repo.getNpcRepository();
          const name = args.owner_name || args.npc_name;
          const matches = npcRepo.search(name);
          if (matches.length > 0) ownerId = matches[0].npc_id;
        }

        let profile = propertyRepo.getPropertyProfile(ownerType, ownerId);
        if (!profile) {
          profile = {
            property_profile_id: `prop_${ownerType}_${ownerId}`,
            owner_context: { owner_type: ownerType as any, owner_id: ownerId },
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

        // Coins Update (Set or Delta)
        if (typeof args.coins_set === 'number') {
          profile.finances.coins = Math.max(0, args.coins_set);
        } else if (typeof args.coins_delta === 'number') {
          const currentCoins = profile.finances?.coins ?? 100;
          profile.finances.coins = Math.max(0, currentCoins + args.coins_delta);
        }

        // Add Item Handler
        if (args.add_item_name) {
          const itemId = `item_${Date.now()}`;
          const qty = typeof args.quantity === 'number' ? args.quantity : 1;
          const cat = args.item_category || 'misc';
          const itemRepo = this.repo.getItemRepository();
          itemRepo.saveItem({
            item_id: itemId,
            template_id: null,
            category: cat,
            public_profile: {
              name: args.add_item_name,
              appearance: 'Ззвичайний вигляд',
              public_description: 'Предмет додано через ШІ-сабагента',
            },
            private_profile: null,
            physical_properties: { weight_kg: 0.5, durability: { current: 100, max: 100, state: 'intact' }, base_value_gold: 10 },
            special_mechanics: null,
            location_context: { current_owner_type: ownerType as any, current_owner_id: ownerId },
          });
          this.repo.saveItem({ itemId, quantity: qty, metadata: { name: args.add_item_name, category: cat } });
          if (!profile.pocket_inventory.pockets_and_belt.items) {
            profile.pocket_inventory.pockets_and_belt.items = [];
          }
          profile.pocket_inventory.pockets_and_belt.items.push({ item_id: itemId, quantity: qty });
        }

        // Remove Item Handler
        if (args.remove_item_name) {
          const itemRepo = this.repo.getItemRepository();
          const rName = String(args.remove_item_name).toLowerCase().trim();

          const matchesName = (itemId: string): boolean => {
            const itemRecord = itemRepo.getItem(itemId);
            if (itemRecord) {
              const name = itemRecord.public_profile?.name || (itemRecord as any).metadata?.name;
              if (name && name.toLowerCase().includes(rName)) {
                return true;
              }
            }
            return itemId.toLowerCase().includes(rName);
          };

          if (profile.pocket_inventory.pockets_and_belt?.items) {
            profile.pocket_inventory.pockets_and_belt.items = profile.pocket_inventory.pockets_and_belt.items.filter(
              (i) => !matchesName(i.item_id)
            );
          }
          if (profile.pocket_inventory.backpack?.items) {
            profile.pocket_inventory.backpack.items = profile.pocket_inventory.backpack.items.filter(
              (i) => !matchesName(i.item_id)
            );
          }
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
          message: ownerType === 'player' ? 'Майно гравця успішно оновлено через ШІ-сабагента' : `Майно для ${ownerType}:${ownerId} успішно оновлено через ШІ-сабагента`,
          data: { property: profile },
        };
      }

      case 'update_world_environment': {
        const worldRepo = this.repo.getWorldStateRepository();
        const playerStateRepo = this.repo.getPlayerStateRepository();
        const worldService = new WorldStateService(worldRepo, playerStateRepo);

        // 1. Weather Update
        const weatherType = args.weather_type || args.weather_condition || args.condition;
        if (weatherType) {
          const weatherMap: Record<string, string> = {
            downpour: 'Сильна злива',
            rain: 'Дощ',
            thunderstorm: 'Гроза та злива',
            fog: 'Густий туман',
            clear: 'Ясно, сонячно',
            blizzard: 'Заметіль, хуртовина',
            solar_flare: 'Сонячний спалах',
            злива: 'Сильна злива',
            туман: 'Густий туман',
            ясно: 'Ясно, сонячно',
          };
          const conditionText = weatherMap[String(weatherType).toLowerCase()] || String(weatherType);
          worldService.overrideWeather({
            condition: conditionText,
            from_hour: 0,
            to_hour: 24,
          });
        }

        // 2. Time of Day Update
        if (args.time_of_day) {
          const timeMap: Record<string, number> = {
            morning: 8,
            day: 14,
            evening: 19,
            night: 23,
            ранок: 8,
            день: 14,
            вечір: 19,
            ніч: 23,
          };
          const hour = timeMap[String(args.time_of_day).toLowerCase()] ?? 12;
          const currentState = worldService.getWorldState();
          const currDate = new Date(currentState.time.current_date);
          currDate.setUTCHours(hour, 0, 0, 0);
          worldRepo.saveTimeAndWeather(currDate.toISOString(), currentState.weather.timeline);
        }

        // 3. Advance Time Update
        if (args.advance_hours || args.advance_days) {
          worldService.advanceTime(
            {
              hours: args.advance_hours || 0,
              days: args.advance_days || 0,
            },
            sessionId
          );
        }

        const updatedWorld = worldService.getWorldState();
        return {
          success: true,
          message: `Стан світу успішно оновлено через ШІ-сабагента (Погода: ${updatedWorld.weather.current_condition})`,
          data: { worldState: updatedWorld },
        };
      }

      case 'update_organization_reputation': {
        const orgRepo = this.repo.getOrganizationRepository();
        let orgId = args.organization_id;
        let org = orgId ? orgRepo.findById(orgId) : null;
        if (!org && (args.organization_name || args.organization_id)) {
          const searchTerm = (args.organization_name || args.organization_id).toLowerCase().trim();
          const allOrgs = orgRepo.getAll();
          org = allOrgs.find(o => o.organization_id.toLowerCase() === searchTerm || o.name.toLowerCase().includes(searchTerm)) || null;
          if (org) orgId = org.organization_id;
        }
        if (!org) {
          return { success: false, message: `Організацію "${args.organization_name || args.organization_id}" не знайдено` };
        }
        const repDelta = typeof args.reputation_delta === 'number' ? args.reputation_delta : 0;
        orgRepo.updatePlayerAffiliation(orgId, {
          rank_id: args.rank_id,
          reputation_delta: repDelta,
          interaction_event: args.description || `Взаємодія оновлена ШІ-сабагентом`,
        });
        if (typeof args.is_known_to_player === 'boolean') {
          orgRepo.updateStatus(orgId, { is_known_to_player: args.is_known_to_player });
        }
        return {
          success: true,
          message: `Репутацію у фракції "${org.name}" успішно оновлено (${repDelta >= 0 ? '+' : ''}${repDelta})`,
          data: { organization_id: orgId },
        };
      }

      default:
        return {
          success: false,
          message: `Невідомий інструмент сабагента: ${toolName}`,
        };
    }
  }

  private async executeFallback(
    sessionId: string,
    subagentGroup: SubagentGroup,
    instruction: string
  ): Promise<SubagentExecutionResult> {
    logger.subagent('Executing Fallback Subagent Logic', { subagentGroup, instruction });
    const lower = instruction.toLowerCase();

    if (subagentGroup === 'actor') {
      const playerRepo = this.repo.getPlayerStateRepository();
      const worldRepo = this.repo.getWorldStateRepository();
      const propertyRepo = this.repo.getPropertyRepository();
      const propService = new PropertyService(propertyRepo, this.repo.getItemRepository(), playerRepo);
      const playerStateService = new PlayerStateService(playerRepo, propService, worldRepo);

      let updatePayload: any = {};

      if (lower.includes('виснаження') || lower.includes('ефект') || lower.includes('стан')) {
        let effectName = 'exhaustion';
        const effectMatch = instruction.match(/["'«]([^"'»]+)["'»]/);
        if (effectMatch && effectMatch[1]) effectName = effectMatch[1].trim();
        updatePayload.add_physical_states = [effectName];
      }

      // Skill progression fallback
      if (lower.includes('навички') || lower.includes('магі') || lower.includes('скіл') || lower.includes('підніми')) {
        if (lower.includes('вогонь') || lower.includes('вогню') || lower.includes('fire')) {
          updatePayload.skill_name = 'Магія вогню';
          updatePayload.skill_value = 60;
        } else if (lower.includes('енергі') || lower.includes('energy')) {
          updatePayload.skill_name = 'Маніпуляція енергією';
          updatePayload.skill_value = 45;
        }
      }

      const playerState = playerStateService.updatePlayerState(sessionId, updatePayload);

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
    const playerStateRepo = this.repo.getPlayerStateRepository();
    const worldService = new WorldStateService(worldRepo, playerStateRepo);

    if (lower.includes('погод') || lower.includes('дощ') || lower.includes('злив')) {
      worldService.overrideWeather({
        condition: 'Сильна злива',
        from_hour: 0,
        to_hour: 24,
      });
    }

    const worldState = worldService.getWorldState();
    return {
      success: true,
      message: `Сабагент ${subagentGroup.toUpperCase()} опрацював інструкцію: "${instruction}"`,
      data: { worldState },
    };
  }
}
