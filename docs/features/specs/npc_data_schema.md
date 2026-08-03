# Консолідована схема даних NPC

Ця схема є єдиним стандартом структури даних для сутності NPC у системі. Вона об'єднує:
1. Психологічний профіль.
2. Систему знання.
3. Соціальні зв'язки.
4. Публічні дані.

Ця структура використовується як основний об'єкт для:
1. Зберігання в базі даних (як JSON-об'єкт).
2. Формування контексту для Майстра (DM).
3. Відстеження стану світу та прогресу гравця.

```json
{
  "npc_id": "UUID",
  "status": "alive | dead | coma | missing | captured | archived", // Фіксований життєвий статус для швидкої фільтрації в БД та розуміння стану Майстром
  "public_profile": {
    "name": "String",
    "role": "String",
    "appearance": "String",
    "public_description": "Стислий опис персонажа, видимий гравцеві"
  },
  "private_profile": {
    "traits": {
      "moral_alignment": "Текстовий опис моральних принципів",
      "resilience": "Опис стійкості до тиску",
      "social_style": "Опис манери спілкування"
    },
    "drivers": {
      "primary_goals": ["Список цілей", "Що персонаж хоче досягти"],
      "critical_fears": ["Список страхів", "Чого персонаж боїться найбільше"]
    },
    "attachments": {
      "family_loyalty": "Опис зв'язок із сім'єю",
      "organization_loyalty": "Опис відданості фракції",
      "core_values": "Інші ключові прив'язовості"
    },
    "current_status": {
      "mood": "Поточний емоційний стан",
      "relationship_to_player": "Поточне ставлення до гравця (текстовий опис)",
      "current_goal": "Поточна активна мета, яку Майстер зараз реалізує для цього NPC"
    }
  },
  "knowledge": {
    "world_perception": {
      "description": "Поточний опис персонажа, який він сам про себе вважає (може відрізнятися від public_description)",
      "dynamic_updates": [
        {
          "timestamp": 1700000000,
          "trigger": "взаємодія",
          "update_text": "Опис того, як подія змінила світовидіння NPC"
        }
      ]
    },
    "hidden_memory": {
      "events": [
        {
          "timestamp": 1700000000,
          "event_description": "Опис події, яку NPC побачив або пережив",
          "source_type": "direct_interaction | observation | world_event"
        }
      ],
      "memory_summary": "String", // Стиснений опис накопичених подій для економії токенів при великій історії
      "secrets": [
        {
          "secret_id": "String (Унікальний технічний ідентифікатор, наприклад 'sec_01', для надійного виклику тула розкриття)",
          "description": "Секретна інформація",
          "source": "witnessed | heard | innate",
          "discovery_status": "hidden | discovered_by_player | revealed_to_all // При розкритті подається суворо наративно і залишає слід у public_description, без UI-плашок"
        }
      ]
    },
    "subjective_thoughts": {
      "player_evaluation": "Оцінка гравця з точки зору NPC",
      "topics_discussed": ["Перелік тем, які обговорювалися з гравцем"],
      "mood_impact": "Як останні події вплинули на емоційний стан"
    },
    "player_notes": {
      "content": "Приватні нотатки гравця про цього NPC (невидимі для ШІ)",
      "last_updated": 1700000000
    }
  },
  "relationships": [
    {
      "target_npc_id": "UUID",
      "relationship_type": "String", // Наприклад: "Family", "Enemy", "Ally", "Business_Partner", "Secret_Associate"
      "strength": "Float", // Від -1.0 (ворожнесть) до 1.0 (лояльність)
      "summary": "Коротке резюме останньої суттєвої взаємодії",
      "last_updated": 1700000000
    }
  ],
  "organizations": [
    {
      "organization_id": "String",
      "rank_id": "String | null", // Якщо null - не є членом, але має репутацію
      "reputation": "Integer", // Від -100 до 100
      "interactions": [
        {
          "timestamp": "ISO String",
          "description": "Стислий опис впливу на організацію (для контексту Майстра)",
          "reputation_change": "Integer"
        }
      ]
    }
  ],
  "spatial_presence": {
    "current_location_id": "loc_smithy_01", // Поточне фактичне місцезнаходження
    "default_routine": [
      {
        "time_window": "08:00–18:00",
        "location_id": "loc_smithy_01",
        "activity": "Працює в кузні, кує зброю та ремонтує обладунки."
      },
      {
        "time_window": "18:00–22:00",
        "location_id": "loc_tavern_boar",
        "activity": "Вечеряє та спілкується з завсідниками в таверні."
      },
      {
        "time_window": "22:00–08:00",
        "location_id": "loc_blacksmith_home",
        "activity": "Спить у своєму будинку."
      }
    ],
    "override_event": null // Тимчасове сюжетне перекриття розкладу (наприклад: "Збори ополчення на міській площі через загрозу нападу")
  }
}
```

## Просторове розташування та Розклад (`spatial_presence`)
- **Динамічна присутність замість статичної прив'язки**: Поле `spatial_presence` вирішує проблему прикріплення NPC до однієї локації 24/7.
- **`default_routine` (Розклад)**: Визначає стандартний порядок дня персонажа (робота, дозвілля, сон). Коли система або ШІ-Майстер розраховує присутність NPC на мапі, вона звіряє поточний внутрішньоігровий час із цим розкладом.
- **`override_event` та `current_location_id`**: ШІ-Майстер має абсолютний пріоритет і може в будь-який момент перекрити стандартний розклад через сюжетну подію (тривога, напад дракона, фестиваль, арешт), перемістивши персонажа в іншу точку світу.

## Правила оптимізації контексту (Context Optimization Rules)

Для запобігання "токенному вибуху" Майстер використовує три режими витягування даних:

1. **Mode: DIALOG**
   - Витягується: `public_profile`, `private_profile`, `subjective_thoughts`, `relationships` (лише високої важності: strength > 0.5 або < -0.5).
   - Мета: Максимально глибоке відіграш особистості під час розмови.

2. **Mode: ACTION**
   - Витягується: `public_profile`, `private_profile.drivers`, `current_status`, `relationships` (лише критичні категорії: Family, Secret_Associate).
   - Мета: Визначення ініціатив та проактивних дій у сцені.

3. **Mode: INVESTIGATION**
   - Витягується: `public_profile`, `private_profile`, `hidden_memory` (включаючи `memory_summary`), `secrets`.
   - Мета: Розкриття таємниць та аналіз минулого.

**Примітка щодо пам'яті**: Поле `hidden_memory.events` має бути динамічно стиснуте у `memory_summary`, якщо кількість подій перевищує встановлений ліміт (наприклад, > 10).
