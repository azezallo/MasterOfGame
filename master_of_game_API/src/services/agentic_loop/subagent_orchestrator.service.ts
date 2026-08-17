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
      description: 'ІНСПЕКЦІЙНИЙ: Повертає майно сутності (монети, інвентар кишень та рюкзака). За замовчуванням owner_type="player".',
      parameters: {
        type: 'object',
        properties: {
          owner_type: { type: 'string', enum: ['player', 'npc'], description: 'Власник майна. За замовчуванням "player".' },
          owner_name: { type: 'string', description: 'Ім\'я NPC (обов\'язково якщо owner_type="npc")' },
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
      description: 'МУТАЦІЙНИЙ ACTOR: Зміна показників гравця. Мана: mana_delta або mana_percent. Навичка: skill_name + skill_value або skill_delta. Стани: add/remove фізичних, тілесних, психологічних.',
      parameters: {
        type: 'object',
        properties: {
          add_physical_states: {
            type: 'array',
            items: { type: 'string' },
            description: 'Додати фізичні стани (напр. ["Виснаження", "Глибоке поранення"])',
          },
          remove_physical_states: {
            type: 'array',
            items: { type: 'string' },
            description: 'Зняти фізичні стани (напр. ["Виснаження"])',
          },
          add_body_states: {
            type: 'array',
            items: { type: 'string' },
            description: 'Додати тілесні стани (напр. ["Опік лівої руки"])',
          },
          remove_body_states: {
            type: 'array',
            items: { type: 'string' },
            description: 'Зняти тілесні стани',
          },
          add_psychological_states: {
            type: 'array',
            items: { type: 'string' },
            description: 'Додати психологічні стани (напр. ["Шок", "Панічний страх"])',
          },
          remove_psychological_states: {
            type: 'array',
            items: { type: 'string' },
            description: 'Зняти психологічні стани',
          },
          mana_delta: {
            type: 'number',
            description: 'Зміна мани в абсолютних одиницях (напр. -15 або +30)',
          },
          mana_percent: {
            type: 'number',
            description: 'Зміна мани у відсотках (напр. -50 = зняти половину)',
          },
          skill_name: {
            type: 'string',
            description: 'Назва навички (напр. "Магія вогню", "Володіння мечем")',
          },
          skill_value: {
            type: 'number',
            description: 'Нове абсолютне значення навички (0-100)',
          },
          skill_delta: {
            type: 'number',
            description: 'Зміна значення навички (напр. +10 або -5)',
          },
          update_attributes: {
            type: 'object',
            description: 'Оновлення атрибутів (напр. {"strength": 30, "agility": 25})',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_or_update_npc',
      description: 'МУТАЦІЙНИЙ ACTOR: Створення нового NPC або оновлення існуючого. Пошук існуючого NPC виконується автоматично за name. Для таємниць НЕ використовуй цей тул — використовуй update_npc_secret.',
      parameters: {
        type: 'object',
        properties: {
          npc_id: { type: 'string', description: 'ID NPC для точного оновлення (якщо відомий)' },
          name: { type: 'string', description: 'Повне ім\'я NPC (обов\'язково)' },
          role: { type: 'string', description: 'Роль або професія NPC' },
          appearance: { type: 'string', description: 'Зовнішній вигляд NPC' },
          description: { type: 'string', description: 'Публічний опис NPC' },
          status: { type: 'string', enum: ['alive', 'wounded', 'dead', 'coma', 'missing', 'captured', 'archived'], description: 'Життєвий статус NPC' },
          location_id: { type: 'string', description: 'ID локації перебування NPC' },
          relationship_to_player: { type: 'string', enum: ['friendly', 'hostile', 'neutral', 'loyal', 'suspicious'], description: 'Ставлення до гравця' },
          mood: { type: 'string', enum: ['calm', 'angry', 'fearful', 'excited', 'sad', 'panicked'], description: 'Емоційний стан NPC' },
          current_goal: { type: 'string', description: 'Поточна мета NPC' },
          target_name: { type: 'string', description: 'Ім\'я іншого NPC для зв\'язку' },
          target_npc_id: { type: 'string', description: 'ID іншого NPC для зв\'язку' },
          relationship_type: { type: 'string', enum: ['ally', 'rival', 'family', 'enemy', 'acquaintance', 'business_partner'], description: 'Тип зв\'язку між NPC' },
          relationship_summary: { type: 'string', description: 'Опис зв\'язку між NPC' },
          relationship_strength: { type: 'number', description: 'Сила зв\'язку (-1.0 до 1.0)' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_npc_secret',
      description: 'ОСНОВНИЙ ІНСТРУМЕНТ ACTOR: Управління таємницями NPC. Дві дії: (1) action="add" — додати нову приховану таємницю (потрібні: name + secret_description). (2) action="reveal" — розкрити існуючу таємницю гравцю (потрібні: name + secret_id з досьє NPC). Для розкриття СПОЧАТКУ виклич get_npc_dossier щоб знайти secret_id.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['add', 'reveal'], description: 'Обов\'язково. "add" = додати нову таємницю. "reveal" = розкрити існуючу таємницю гравцю.' },
          npc_id: { type: 'string', description: 'ID NPC (якщо відомий)' },
          name: { type: 'string', description: 'Ім\'я NPC для пошуку' },
          secret_id: { type: 'string', description: 'Технічний ID таємниці з досьє NPC (обов\'язково при action="reveal")' },
          secret_description: { type: 'string', description: 'Текст нової таємниці (обов\'язково при action="add")' },
          discovery_status: { type: 'string', enum: ['hidden', 'discovered_by_player'], description: 'Статус таємниці при додаванні. За замовчуванням "hidden".' },
        },
        required: ['action'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_npc_relationship',
      description: 'МУТАЦІЙНИЙ ACTOR: Два режими. (1) Ставлення до гравця: name + relationship_to_player. (2) Зв\'язок між NPC: name + target_name + relationship_type.',
      parameters: {
        type: 'object',
        properties: {
          npc_id: { type: 'string', description: 'ID NPC (якщо відомий)' },
          name: { type: 'string', description: 'Ім\'я NPC' },
          relationship_to_player: { type: 'string', enum: ['friendly', 'hostile', 'neutral', 'loyal', 'suspicious'], description: 'Нове ставлення до гравця' },
          mood: { type: 'string', enum: ['calm', 'angry', 'fearful', 'excited', 'sad', 'panicked'], description: 'Настрій NPC' },
          target_name: { type: 'string', description: 'Ім\'я іншого NPC для зв\'язку' },
          target_npc_id: { type: 'string', description: 'ID іншого NPC для зв\'язку' },
          relationship_type: { type: 'string', enum: ['ally', 'rival', 'family', 'enemy', 'acquaintance', 'business_partner'], description: 'Тип зв\'язку між NPC' },
          strength: { type: 'number', description: 'Сила відносин (-1.0 до 1.0)' },
          summary: { type: 'string', description: 'Опис відносин' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_npc_memory_event',
      description: 'МУТАЦІЙНИЙ ACTOR: Записати подію у приватну пам\'ять NPC. Потрібно: name або npc_id + event_description.',
      parameters: {
        type: 'object',
        properties: {
          npc_id: { type: 'string', description: 'ID NPC (якщо відомий)' },
          name: { type: 'string', description: 'Ім\'я NPC для пошуку' },
          event_description: { type: 'string', description: 'Опис пережитої події' },
          source_type: { type: 'string', enum: ['direct_interaction', 'rumor', 'witnessed', 'world_event'], description: 'Джерело спогаду. За замовчуванням "direct_interaction".' },
        },
        required: ['event_description'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_property_finances_and_items',
      description: 'МУТАЦІЙНИЙ PROPERTY: Зміна монет та інвентарю гравця або NPC. Монети: coins_delta (напр. +50 або -20) АБО coins_set. Предмети: add_item_name для додавання, remove_item_name для видалення. За замовчуванням owner_type="player".',
      parameters: {
        type: 'object',
        properties: {
          owner_type: { type: 'string', enum: ['player', 'npc'], description: 'Власник майна. За замовчуванням "player".' },
          owner_name: { type: 'string', description: 'Ім\'я NPC (обов\'язково якщо owner_type="npc")' },
          coins_delta: {
            type: 'number',
            description: 'Зміна монет (+50 додати, -20 зняти). НЕ використовуй разом з coins_set.',
          },
          coins_set: {
            type: 'number',
            description: 'Встановити точну кількість монет. НЕ використовуй разом з coins_delta.',
          },
          add_item_name: {
            type: 'string',
            description: 'Назва предмета для додавання в інвентар',
          },
          item_category: {
            type: 'string',
            enum: ['weapon', 'potion', 'armor', 'key', 'document', 'misc'],
            description: 'Категорія предмета. За замовчуванням "misc".',
          },
          remove_item_name: {
            type: 'string',
            description: 'Назва предмета для видалення з інвентарю',
          },
          quantity: {
            type: 'number',
            description: 'Кількість предмета. За замовчуванням 1.',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_world_environment',
      description: 'МУТАЦІЙНИЙ WORLD: Зміна погоди, часу та подій. Можна комбінувати декілька змін в одному виклику (напр. погода + час).',
      parameters: {
        type: 'object',
        properties: {
          weather_type: {
            type: 'string',
            enum: ['clear', 'rain', 'downpour', 'thunderstorm', 'fog', 'blizzard', 'solar_flare'],
            description: 'Тип погоди',
          },
          weather_intensity: {
            type: 'number',
            description: 'Інтенсивність погоди (0-100)',
          },
          time_of_day: {
            type: 'string',
            enum: ['morning', 'day', 'evening', 'night'],
            description: 'Встановити час доби',
          },
          advance_hours: {
            type: 'number',
            description: 'Просунути час на N годин',
          },
          advance_days: {
            type: 'number',
            description: 'Просунути час на N днів',
          },
          event_action: {
            type: 'string',
            enum: ['create', 'update', 'resolve'],
            description: 'Дія над подією світу',
          },
          event_title: {
            type: 'string',
            description: 'Назва світової події (потрібно для event_action)',
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
      description: 'МУТАЦІЙНИЙ WORLD/ACTOR: Зміна репутації гравця у фракції. Потрібно: organization_name або organization_id + reputation_delta.',
      parameters: {
        type: 'object',
        properties: {
          organization_id: { type: 'string', description: 'ID організації (напр. org_city_guard)' },
          organization_name: { type: 'string', description: 'Назва організації (напр. "Міська варта")' },
          reputation_delta: { type: 'number', description: 'Зміна репутації (-100 до +100)' },
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
  private memoryService?: SemanticMemoryService | undefined;
  private llmProvider?: ILLMProvider | undefined;
  private modelName?: string | undefined;

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
      return `Ви — Сабагент ACTOR. Ваша задача: отримати інструкцію → за потреби інспектувати поточний стан → викликати МУТАЦІЙНИЙ інструмент для зміни стану. ЗАВЖДИ завершуйте виклик мутаційного інструменту!

ІНСПЕКЦІЙНІ ІНСТРУМЕНТИ (читання даних перед змінами):
- get_npc_dossier: Отримати досьє NPC (профіль, таємниці з secret_id, відносини)
- get_player_state: Перевірити HP, ману, навички, стани гравця
- get_property_profile: Перевірити інвентар та монети
- search_memory: Пошук у векторній пам'яті

МУТАЦІЙНІ ІНСТРУМЕНТИ (зміна стану — ОБОВ'ЯЗКОВО виклич один після інспекції):

1. update_player_state — Мана, HP, навички, фізичні/психологічні стани гравця.
   Приклади: mana_delta=-15, add_physical_states=["Виснаження"], skill_name="Магія вогню" + skill_delta=+5

2. create_or_update_npc — Створення нового NPC або редагування існуючого (профіль, локація, настрій, мета).
   Потрібно: name. Опціонально: role, appearance, description, status, location_id, mood, relationship_to_player, current_goal.
   Для зв'язків між NPC: target_name + relationship_type + relationship_strength.

3. update_npc_secret — Додати або розкрити таємницю NPC.
   Додати нову: action="add", name="...", secret_description="..."
   Розкрити існуючу: action="reveal", name="...", secret_id="..." (secret_id бери з результату get_npc_dossier → knowledge.hidden_memory.secrets)

4. update_npc_relationship — Змінити ставлення NPC до гравця або зв'язок між NPC.
   До гравця: name + relationship_to_player + mood.
   Між NPC: name + target_name + relationship_type + strength.

5. add_npc_memory_event — Записати подію у приватну пам'ять NPC.
   Потрібно: name або npc_id, event_description.

6. update_organization_reputation — Змінити репутацію гравця у фракції.
   Потрібно: organization_name або organization_id, reputation_delta.

ВАЖЛИВО:
- Якщо потрібні дані для мутації (наприклад secret_id) — спочатку виклич інспекційний інструмент, потім мутаційний.
- НЕ завершуй роботу після інспекції — ОБОВ'ЯЗКОВО виклич мутаційний інструмент!
- Таємниці НЕ записуй у публічний опис description — використовуй update_npc_secret.`;
    }

    if (subagentGroup === 'property') {
      return `Ви — Сабагент PROPERTY. Ваша задача: отримати інструкцію → за потреби інспектувати поточний стан → викликати МУТАЦІЙНИЙ інструмент. ЗАВЖДИ завершуйте мутаційним викликом!

ІНСПЕКЦІЙНІ ІНСТРУМЕНТИ (читання):
- get_property_profile: Перевірити монети та інвентар (owner_type="player" за замовчуванням, для NPC: owner_type="npc" + owner_name)
- get_player_state: Перевірити показники гравця

МУТАЦІЙНИЙ ІНСТРУМЕНТ (ОБОВ'ЯЗКОВО виклич після інспекції):

update_property_finances_and_items — Зміна монет та предметів.
  Монети: coins_delta=+50 (додати) або coins_delta=-20 (зняти). АБО coins_set=100 (встановити).
  Додати предмет: add_item_name="Магічний факел", item_category="misc"
  Видалити предмет: remove_item_name="Магічний факел"
  Для NPC: owner_type="npc", owner_name="Ім'я NPC"

ВАЖЛИВО:
- coins_delta та coins_set — взаємовиключні, використовуй тільки один.
- НЕ завершуй роботу після інспекції — ОБОВ'ЯЗКОВО виклич мутаційний інструмент!`;
    }

    return `Ви — Сабагент WORLD. Ваша задача: отримати інструкцію → за потреби інспектувати поточний стан → викликати МУТАЦІЙНИЙ інструмент. ЗАВЖДИ завершуйте мутаційним викликом!

ІНСПЕКЦІЙНІ ІНСТРУМЕНТИ (читання):
- get_world_state: Перевірити поточний час, дату та погоду
- search_memory: Пошук у векторній пам'яті

МУТАЦІЙНІ ІНСТРУМЕНТИ (ОБОВ'ЯЗКОВО виклич один після інспекції):

1. update_world_environment — Зміна погоди, часу та подій. Можна комбінувати.
   Погода: weather_type="rain", weather_intensity=70
   Час: time_of_day="night" АБО advance_hours=3 АБО advance_days=1
   Події: event_action="create" + event_title + event_description

2. update_organization_reputation — Зміна репутації гравця у фракції.
   Потрібно: organization_name + reputation_delta (напр. +25 або -15)
   Опціонально: rank_id, description, is_known_to_player

ВАЖЛИВО:
- НЕ завершуй роботу після інспекції — ОБОВ'ЯЗКОВО виклич мутаційний інструмент!`;
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
        const toolCall = res.toolCalls[0]!;
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
            tool_calls: [toolCall as any],
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
          if (matches.length > 0) ownerId = (matches[0] ? matches[0]!.npc_id : ownerId);
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
            npc = searchResults[0] || null;
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
            existing = searchResults[0] || null;
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

        // Secrets are handled exclusively via 'update_npc_secret' tool — not here.

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
          if (matches.length > 0) ownerId = (matches[0] ? matches[0]!.npc_id : ownerId);
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
          profile!.finances.coins = Math.max(0, args.coins_set);
        } else if (typeof args.coins_delta === 'number') {
          const currentCoins = profile.finances?.coins ?? 100;
          profile!.finances.coins = Math.max(0, currentCoins + args.coins_delta);
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
          if (!profile!.pocket_inventory.pockets_and_belt.items) {
            profile!.pocket_inventory.pockets_and_belt.items = [];
          }
          profile!.pocket_inventory.pockets_and_belt.items.push({ item_id: itemId, quantity: qty });
        }

        // Remove Item Handler
        if (args.remove_item_name) {
          const itemRepo = this.repo.getItemRepository();
          const rName = String(args.remove_item_name).toLowerCase().trim();

          const matchesName = (itemId: string): boolean => {
            const itemRecord = itemRepo.getItem(itemId);
            if (itemRecord) {
              const name = itemRecord.public_profile?.name || (itemRecord as unknown as { metadata?: { name?: string } }).metadata?.name;
              if (name && name.toLowerCase().includes(rName)) {
                return true;
              }
            }
            return itemId.toLowerCase().includes(rName);
          };

          if (profile!.pocket_inventory.pockets_and_belt?.items) {
            profile!.pocket_inventory.pockets_and_belt.items = profile!.pocket_inventory.pockets_and_belt.items.filter(
              (i) => !matchesName(i.item_id)
            );
          }
          if (profile!.pocket_inventory.backpack?.items) {
            profile!.pocket_inventory.backpack.items = profile!.pocket_inventory.backpack.items.filter(
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
          const allOrgs = orgRepo.findAll();
          org = allOrgs.find((o: any) => o.id.toLowerCase() === searchTerm || o.name.toLowerCase().includes(searchTerm)) || null;
          if (org) orgId = org.id;
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
