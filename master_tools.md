# Повний перелік інструментів ШІ-Майстра (Master Tools)

Цей документ містить повний перелік інструментів (Tool Calling / Function Calling API), розроблених для ШІ-Майстра у грі **Master of Game** відповідно до реалізованих фіч з [roadmap.md](file:///d:/My/MasterOfGame/docs/features/roadmap.md).

Згідно з концепцією **Sovereign AI** та **Narrative-First UI**, ШІ-Майстер керує станом гри не через монолітні жорсткі скрипти, а через структуровані інструменти бекенду, перетворюючи наративні наміри гравця на точні зміни у базі даних.

---

## Зміст
1. [Інструменти Стану Гравця (Player State - F009)](#1-інструменти-стану-гравця-player-state---f009)
2. [Інструменти Персонажів та NPC (NPC - F005)](#2-інструменти-персонажів-та-npc-npc---f005)
3. [Інструменти Мапи та Локацій (Map & Locations - F006)](#3-інструменти-мапи-та-локацій-map--locations---f006)
4. [Інструменти Майна, Інвентарю та Фінансів (Property - F007)](#4-інструменти-майна-інвентарю-та-фінансів-property---f007)
5. [Інструменти Предметів та Інтерактивних Об'єктів (Items & Objects - F014)](#5-інструменти-предметів-та-інтерактивних-обєктів-items--objects---f014)
6. [Інструменти Стан Світу, Погоди та Календаря (World State - F008 / F015)](#6-інструменти-стану-світу-погоди-та-календаря-world-state---f008--f015)
7. [Інструменти Організацій та Фракцій (Organizations - F011)](#7-інструменти-організацій-та-фракцій-organizations---f011)
8. [Інструменти Семантичної Пам'яті (Semantic Memory - F017)](#8-інструменти-семантичної-памяті-semantic-memory---f017)
9. [Агентний Цикл та Розподіл по Сабагентах (Agentic Loop - F012)](#9-агентний-цикл-та-розподіл-по-сабагентах-agentic-loop---f012)

---

## 1. Інструменти Стану Гравця (Player State - F009)

| Назва інструмента | Опис | Ключові параметри |
|---|---|---|
| `get_player_state` | Повертає поточні показники гравця (мана, характеристики, масив навичок `SkillEntry[]`, фізичні, тілесні та психологічні стани) для аналізу перед прийняттям рішень. | *Немає (контекст сесії)* |
| `update_player_state` | Модифікує стан гравця на основі дій (нарахування/зняття мани, % мани, додавання чи зняття ефектів, оновлення характеристик та динамічних навичок). | `mana_delta`, `mana_percent`, `add_physical_states`, `remove_physical_states`, `add_body_states`, `remove_body_states`, `add_psychological_states`, `remove_psychological_states`, `update_attributes`, `update_skills` (масив `SkillEntry[]`), `skill_name`, `skill_value`, `skill_delta`, `update_magic_stats` |

---

## 2. Інструменти Персонажів та NPC (NPC - F005)

| Назва інструмента | Опис | Ключові параметри |
|---|---|---|
| `create_npc` | Динамічне створення нового NPC в локації "на льоту" (за шаблоном або унікально). | `public_profile`, `private_profile`, `location_id`, `template_id` |
| `create_or_update_npc` | Уніфікований інструмент сабагента для створення або редагування профілю, прихованих таємниць (`secret_description`), ставлення до гравця (`relationship_to_player`, `mood`) та соціальних зв'язків (`target_name`, `relationship_type`). | `npc_id`, `name`, `role`, `appearance`, `description`, `status`, `location_id`, `secret_description`, `secret_discovery_status`, `relationship_to_player`, `mood`, `current_goal`, `target_name`, `target_npc_id`, `relationship_type`, `relationship_summary`, `relationship_strength` |
| `update_npc_secret` | Спеціалізований інструмент сабагента для додавання прихованої таємниці в поле `hidden_memory.secrets` або її розкриття гравцю. | `npc_id`, `name`, `secret_id`, `secret_description`, `discovery_status`, `action` (`add`, `reveal`) |
| `update_npc_relationship` | Спеціалізований інструмент сабагента для зміни ставлення NPC до гравця або встановлення соціальних зв'язків з іншими персонажами. | `npc_id`, `name`, `relationship_to_player`, `mood`, `target_name`, `target_npc_id`, `relationship_type`, `strength`, `summary` |
| `add_npc_memory_event` | Запис нової пережитої події або спогаду у приватне поле `hidden_memory.events` NPC. | `npc_id`, `name`, `event_description`, `source_type` |
| `get_npc_dossier` | Інспекційний інструмент для перегляду досьє та поточного стану NPC за ім'ям чи ID. | `npc_id`, `name` |
| `get_npc_context` | Отримання токен-оптимізованого JSON-контексту NPC залежно від режиму. | `npc_id`, `mode` (`DIALOG`, `ACTION`, `INVESTIGATION`) |
| `search_npcs` | Пошук NPC у поточній локації чи за соціальною роллю без завантаження всієї БД. | `query`, `filter` (`location_id`, `role`, `relationship_type`) |
| `update_npc_public_profile` | Оновлення видимих гравцеві даних NPC (ім'я, роль, зовнішність, опис). | `npc_id`, `updates` (`name`, `role`, `appearance`, `public_description`) |
| `update_npc_status` | Оновлення емоційного стану, ставлення до гравця або поточної мети NPC. | `npc_id`, `updates` (`mood`, `relationship_to_player`, `current_goal`) |
| `update_npc_location` | Зміна фактичного місцезнаходження NPC, розкладу руху чи встановлення тимчасового сюжетного перекриття. | `npc_id`, `updates` (`current_location_id`, `override_event`, `default_routine`) |
| `update_subjective_thoughts` | Оновлення приватної оцінки гравця або списку обговорених тем. | `npc_id`, `updates` (`player_evaluation`, `topics_discussed_add`, `mood_impact`) |
| `overwrite_npc_profile` | Повний перезапис об'єкта NPC для глобальних сюжетних трансформацій. | `npc_id`, `full_npc_data` |
| `update_npc_lifecycle_status` | Зміна життєвого статусу NPC в базі даних. | `npc_id`, `status` (`alive`, `dead`, `coma`, `missing`, `captured`, `archived`), `reason` |
| `archive_npc` | М'яке виведення персонажа з активної гри зі збереженням лору та історії. | `npc_id`, `reason` |

---

## 3. Інструменти Мапи та Локацій (Map & Locations - F006)

| Назва інструмента | Опис | Ключові параметри |
|---|---|---|
| `get_location_context` | Отримання структурованих даних тайла локації у токен-оптимізованому режимі з розрахунком присутніх NPC. | `location_id`, `mode` (`NAVIGATION_MODE`, `DETAILED_MODE`, `REGIONAL_MODE`) |
| `search_locations` | Пошук локацій за назвою, типом чи регіоном без завантаження всієї мапи. | `query`, `filters` (`type`, `parent_location_id`, `discovery_status`) |
| `calculate_distance` | Розрахунок географічної чи топологічної відстані та маршруту між локаціями. | `source_location_id`, `target_location_id` |
| `move_player` | Переміщення гравця у цільову локацію із автоматичним просуванням ігрового часу. | `destination_location_id`, `travel_time_minutes`, `travel_summary` |
| `update_location_state` | Оновлення опису, освітлення, погоди, небезпек або додавання модифікаторів локації. | `location_id`, `updates` (`public_description`, `lighting`, `weather`, `active_hazards`, `add_state_modification`, `remove_modification_ids`) |
| `update_transition_status` | Зміна фізичного стану проходу (відкрито, замкнено, заблоковано). | `location_id`, `transition_id`, `access_status`, `lock_details` |
| `reveal_location_secret` | Розкриття прихованого ходу, пастки чи схованки за ключем `secret_id`. | `location_id`, `secret_id` |
| `create_location` | Динамічна генерація нових кімнат, будівель чи підземель "на льоту". | `parent_location_id`, `location_data`, `blueprint_override` |

---

## 4. Інструменти Майна, Інвентарю та Фінансів (Property - F007)

| Назва інструмента | Опис | Ключові параметри |
|---|---|---|
| `get_owner_property` / `get_property_profile` | Отримання повного профілю майна сутності (монети, вміст кишень/рюкзака, нерухомість, сховища, транспорт). | `owner_type` (`player`, `npc`, `organization`), `owner_id`, `category_filter` |
| `update_property_finances_and_items` | Уніфікований інструмент сабагента для зміни монет (`coins_delta`/`coins_set`) та додавання чи видалення предметів (`add_item_name`, `remove_item_name`, `quantity`). | `coins_delta`, `coins_set`, `add_item_name`, `remove_item_name`, `quantity` |
| `transfer_property` | Універсальне переміщення активів (предметів, монет, прав власності, транспорту) між сутностями або сховищами. | `from_context`, `to_context`, `transfer_details` (`asset_type`, `item_id`, `quantity`, `amount_coins`, `property_id`) |
| `equip_item` / `unequip_item` | Надягання або знімання предмета у визначену зону тіла та шар екіпірування. | `owner_id`, `item_id`, `body_zone`, `layer` (`inner`, `middle`, `outer`, `accessory`), `worn_over_item_id` |
| `toggle_backpack` | Скидання рюкзака на землю (у бою) або піднімання його назад. | `owner_id`, `is_equipped`, `drop_location_id` |
| `modify_finances` | Зміна фінансового балансу (нарахування, списання чи встановлення суми монет). | `owner_type`, `owner_id`, `operation` (`add`, `subtract`, `set`), `amount_coins`, `reason` |
| `register_real_estate` | Реєстрація права власності, оренди чи застави на нерухомість або бізнес. | `owner_id`, `location_id`, `property_name`, `ownership_type`, `rent_details`, `business_and_tax_details`, `create_storage_cache` |
| `manage_vehicle_status` | Керування станом транспорту/їздової тварини (`traveling`, `stabled`, `abandoned`). | `owner_id`, `vehicle_id`, `status`, `current_location_id` |

---

## 5. Інструменти Предметів та Інтерактивних Об'єктів (Items & Objects - F014)

| Назва інструмента | Опис | Ключові параметри |
|---|---|---|
| `get_item_context` | Отримання повних об'єктів предметів за ID (включаючи приховані таємниці, пастки та магію). | `item_ids` |
| `search_items` | Пошук предметів у світі, інвентарях чи контейнерах за фільтрами. | `query`, `owner_type`, `owner_id`, `category` |
| `create_item` | Динамічна генерація предмета за шаблоном чи унікально при обшуках чи квестах. | `template_id`, `location_context`, `overrides` |
| `update_item_properties` | Глибоке редагування зносу (`durability`), магічних властивостей, зарядів або ключів предмета. | `item_id`, `modifications` |
| `reveal_item_secret` | Розкриття прихованих таємниць предмета або повна ідентифікація. | `item_id`, `secret_id`, `reveal_all` |
| `unlock_container` | Взаємодія зі скринями та сейфами (перевірка ключів, зламу відмичками та активація пасток). | `container_id`, `key_id`, `force_open` |
| `read_document` | Читання та розшифрування книг, листів і рун з перевіркою мови й навичок. | `document_id`, `language`, `decryption_skill` |

---

## 6. Інструменти Стану Світу, Погоди та Календаря (World State - F008 / F015)

| Назва інструмента | Опис | Ключові параметри |
|---|---|---|
| `get_world_state` | Отримання поточного стану світу (час доби, дата, розклад погоди, активні світові події). | *Немає (контекст сесії)* |
| `update_world_environment` | Уніфікований інструмент сабагента для зміни погоди, інтенсивності, часу доби та просування часу вперед (`advance_hours`, `advance_days`). | `weather_type`, `weather_intensity`, `time_of_day`, `advance_hours`, `advance_days` |
| `advance_time` | Перемотування ігрового часу на дні/години з автоматичним пасивним відновленням мани за формулою F015. | `days`, `hours` |
| `override_weather` | Жорсткий сюжетний перепис погоди (наприклад, для магічного буревію). | `condition`, `from_hour`, `to_hour` |
| `manage_event` | Створення, оновлення опису або завершення світових подій (GLOBAL, REGIONAL, LOCAL). | `action` (`create`, `update`, `resolve`), `event_id`, `title`, `description`, `tier`, `location_id`, `resolution_summary` |
| `manage_calendar_event` | Управління базою статичних річних свят та пам'ятних дат у календарі. | `action` (`create`, `delete`), `calendar_event_id`, `month`, `day`, `title`, `description` |

---

## 7. Інструменти Організацій та Фракцій (Organizations - F011)

| Назва інструмента | Опис | Ключові параметри |
|---|---|---|
| `get_organizations_list` | Отримання загального списку фракцій у світі за фільтрами. | `filter` (`type`, `is_secret`) |
| `get_organization_details` | Отримання детальної інформації про фракцію, її ресурси та ієрархію (з генерацією Mermaid-графа). | `organization_id` |
| `get_organization_objectives` | Отримання публічних та таємних цілей організації. | `organization_id` |
| `get_organization_members` | Пошук NPC, що належать до організації за рангом або локацією. | `organization_id`, `filter` (`rank_id`, `location_id`) |
| `update_organization_reputation` | Уніфікований інструмент сабагента для зміни репутації гравця у фракції (-100..+100), присвоєння рангу та розкриття таємних фракцій. | `organization_id`, `reputation_delta`, `rank_id`, `description`, `is_known_to_player` |
| `update_player_organization_affiliation` | Зміна рангу, репутації та запис визначної взаємодії гравця з фракцією. | `organization_id`, `updates` (`rank_id`, `reputation_delta`, `interaction_event`) |
| `update_organization_status` | Зміна глобальних параметрів фракції (видимість гравцю `is_known_to_player`, цілі, ресурси). | `organization_id`, `updates` (`is_known_to_player`, `objectives_override`, `resources_change`) |
| `create_organization` | Динамічне створення нової організації/культу/банди під час гри. | `name`, `type`, `is_secret`, `description`, `objectives`, `hierarchy` |

---

## 8. Інструменти Семантичної Пам'яті (Semantic Memory - F017)

| Назва інструмента | Опис | Ключові параметри |
|---|---|---|
| `search_memory` | Семантичний векторний пошук (`sqlite-vec`) по довгостроковій історії гри за текстом, тегами, типом ролі та ігровим часом. | `query`, `tags_filter`, `role_filter`, `world_time_range` |

---

## 9. Агентний Цикл та Розподіл по Сабагентах (Agentic Loop - F012)

У рамках **Master-Subagent Pattern** Наративний Майстер не викликає технічні JSON-інструменти безпосередньо у художній відповіді. Замість цього він формує природномовні інструкції для спеціалізованих сабагентів:

1. **Сабагент Сутностей та Показників (ACTOR Subagent)**
   - *Основні інструменти:* `update_player_state`, `create_or_update_npc`, `update_organization_reputation`.
   - *Інспекційні інструменти:* `get_player_state`, `get_npc_dossier`, `get_property_profile`, `get_world_state`, `search_memory`.
2. **Сабагент Майна та Інвентарю (PROPERTY Subagent)**
   - *Основний інструмент:* `update_property_finances_and_items`.
   - *Інспекційні інструменти:* `get_property_profile`, `get_player_state`, `search_memory`.
3. **Сабагент Світу та Погоди (WORLD Subagent)**
   - *Основні інструменти:* `update_world_environment`, `update_organization_reputation`.
   - *Інспекційні інструменти:* `get_world_state`, `search_memory`.

> **Примітка щодо магічної системи (F015):**
> Магія у грі є вільною наративною системою і не вимагає окремого ендпоінту `cast_spell`. ШІ-Майстер оцінює вартість і ризики магії в своєму розумі, а наслідки застосовує через комбінацію інструментів `update_player_state` (зняття мани/зміна станів) та `update_world_environment` / `manage_event` (наслідки для світу). Пасивна регенерація мани нараховується автоматично під час спливу ігрового часу за формулою щільності магії у локації.
