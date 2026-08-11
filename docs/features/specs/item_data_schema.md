# Схема даних Предметів та Об'єктів світу (`item_data_schema.md`)

Ця схема є єдиним стандартом структури даних для будь-якого предмета чи інтерактивного об'єкта в грі (від звичайної гілки в лісі та залізного ключа до зачиненої скрині з пасткою і магічного меча).

```json
{
  "item_id": "item_thief_signet_01",
  "template_id": "tpl_signet_ring", // Посилання на базовий шаблон (для економії пам'яті та успадкування стандартних властивостей)
  "category": "key", // weapon | armor | jewelry | consumable | key | container | document | artifact | misc
  "public_profile": {
    "name": "Перстень з печаткою",
    "appearance": "Срібний перстень із зображенням вовчої голови, злегка потертий на гранях.",
    "public_description": "Старий масивний перстень. На внутрішній стороні видніється невеликий виступ, схожий на борідку ключа."
  },
  "private_profile": { // Може бути null, якщо це звичайний предмет без прихованих таємниць, магії чи прихованої назви
    "true_name": "Перстень Тіней Гільдії Злодіїв", // Справжня назва, невидима гравцеві до розпізнавання
    "identification_status": "unidentified", // Загальний статус пізнання: unidentified | identified | partially_identified
    "hidden_secrets": [
      {
        "secret_id": "sec_ring_key",
        "secret_type": "key_function", // key_function | magical_power | lore_history | curse
        "description": "Цей перстень має прихований виступ-борідку, що слугує ключем ('item_thief_signet') до таємних люків каналізації Валоріса.",
        "discovery_status": "hidden" // hidden | discovered_by_player (гравець може дізнатися про ключ, не знаючи про магію, або навпаки)
      },
      {
        "secret_id": "sec_ring_invisibility",
        "secret_type": "magical_power",
        "description": "При прокручуванні перстня на пальці активуються чари відведення очей (бонус до скритності або невидимість).",
        "discovery_status": "hidden"
      }
    ],
    "magical_properties": { // Повністю синхронізовано з Глобальною магічною системою (F015 / agent_tools_magic.md)
      "is_magical": true,
      "active_enchantments": [
        {
          "enchantment_id": "ench_stealth_boost",
          "name": "Чари Тіней",
          "effect_description": "Підсилює скритність та відводить очі в темряві",
          "charges": { "current": 3, "max": 3 }, // null, якщо ефект пасивний
          "discovery_status": "hidden" // hidden | discovered
        }
      ],
      "focus_properties": { // Заповнюється для магічних фокусів (жезли, палиці, колоди карт)
        "stability_bonus": {
          "target": "fire_magic", // "all" або назва домену/ефекту (напр. "fire_magic", "energy_manipulation")
          "amount": 35
        },
        "spell_matrix": null, // Ідентифікатор вшитого заклинання (напр. "fireball") для запрограмованих артефактів
        "concentration_required": true // false, якщо заклинання спрацьовує автоматично
      },
      "mana_source": { // Заповнюється для зілля, кристалів-накопичувачів та автономних пристроїв
        "mana_restore": null, // Одноразове відновлення ману при споживанні зілля
        "mana_capacity": 500, // Максимальна ємність кристала/пристрою
        "mana_current": 500, // Поточний запас мани в предметі
        "mana_cost_per_use": 5, // Витрата мани на одне використання
        "requires_mage": false, // false дозволяє активацію пристрою немагами
        "mana_regen": 0 // Швидкість пасивного відновлення мани з навколишнього середовища (0, якщо сам не відновлює)
      }
    }
  },
  "physical_properties": {
    "weight_kg": 0.05,
    "durability": {
      "current": 100,
      "max": 100,
      "state": "intact" // intact | worn | damaged | broken
    },
    "base_value_gold": 15
  },
  "special_mechanics": {
    "key_properties": {
      "unlocks_key_id": "item_thief_signet" // Збігається з transitions.lock_details.key_id на мапі або скринями
    },
    "container_properties": { // Заповнюється, якщо category == 'container' (скрині, гаманці, кошелі, мішки)
      "contained_item_ids": ["item_healing_potion_01"],
      "contained_coins": 100, // Сума універсальних монет, що лежать безпосередньо у цьому кошелі/гаманці чи скрині
      "capacity_weight_kg": 15.0,
      "lock_details": {
        "is_locked": false,
        "key_id": null,
        "lockpick_dc": 0
      },
      "trap_details": {
        "has_trap": false,
        "is_disarmed": false,
        "trap_description": "Отруєна голка в замковій щілині",
        "trap_dc": 15,
        "discovery_status": "hidden" // hidden | discovered (якщо гравець виявив пастку, почув чутки або сам її встановив)
      }
    },
    "document_properties": { // Заповнюється, якщо category == 'document'
      "text_content": "Зустрінемось опівночі біля старих доків. Принесіть перстень.",
      "language": "Загальна мова",
      "is_encrypted": false,
      "decryption_dc": 0
    }
  },
  "location_context": {
    "current_owner_type": "location", // location | npc | player | container
    "current_owner_id": "loc_tavern_boar" // Де саме зараз лежить чи в кого знаходиться предмет
  }
}
```

---

## 1. Опис полів та Правила ізоляції

Ця схема визначає єдиний стандарт для зберігання предметів у базі даних ігрової сесії та в статичній таблиці шаблонів:

### 1.1. Шаблони та Легковаговість (`template_id`, `private_profile`)
- **Спадкування шаблонів**: Будь-який предмет у світі може посилатися на базовий шаблон (`template_id`, наприклад `tpl_iron_sword`). Всі поля, які збігаються зі стандартним мечем (назва, вигляд, вага, ціна), не потрібно дублювати в записі екземпляра — вони підставляються автоматично.
- **Оптимізація пам'яті (`private_profile: null`)**: Для 90% звичайних побутових предметів у грі (яблука, звичайний одяг, звичайна зброя) поле `private_profile` дорівнює `null`. Це свідчить про те, що предмет повністю прозорий для гравця і не містить прихованих властивостей чи таємної магії.

### 1.2. Таємниці та Розпізнавання (`hidden_secrets`, `identification_status`)
- **Непізнаний стан (`identification_status: "unidentified"`)**: Якщо предмет має особливу природу, гравець бачить лише поверхневий опис з `public_profile`.
- **Масив незалежних таємниць (`hidden_secrets`)**: Замість одного загального прапорця, предмет може мати цілий пучок таємниць (наприклад: одночасно є магічним артефактом, ключем і носієм прокляття). Кожна таємниця має власний статус розпізнавання (`discovery_status: "hidden" | "discovered"`), завдяки чому гравець може дізнатися про ключ, навіть не підозрюючи про магію.
- **Магічні властивості (`magical_properties`)**: Синхронізований блок, що включає масив активних/пасивних чар (`active_enchantments`), параметри фокусів концентрації (`focus_properties`) та джерела/накопичувачі мани (`mana_source`).

### 1.3. Спеціальні механіки: Ключі, Контейнери та Документи
- **Ключі (`unlocks_key_id`)**: Ідентифікатор, що синхронізується з засувами мапи (`transitions.lock_details.key_id`) або замками скринь для автоматичного відкриття.
- **Контейнери, Скрині та Гаманці/Кошелі**: Зберігають масив вкладених предметів (`contained_item_ids`), суму вкладених монет (`contained_coins`), місткість за вагою, параметри замка та таємну пастку (`trap_details`). Окремий кошель із монетами є фізичним предметом `container`, що дозволяє ШІ-Майстру передавати, зрізати з пояса чи губити його як цілісний об'єкт разом із грошима всередині. Пастка має власний статус `discovery_status`, щоб відображатися в UI, якщо персонаж її виявив чи встановив.
- **Документи**: Книги, листи і сувої зберігають текст (`text_content`), мову та складність розшифрування.

### 1.4. Правила ізоляції (Data Isolation)
Для запобігання підгляданню через DevTools браузера, бекенд фільтрує об'єкт перед відправкою на клієнт:
1. Поле `private_profile` видаляється, якщо предмет непізнаний і жодна таємниця не розкрита.
2. З масиву `hidden_secrets` передаються лише записи зі статусом `discovered`.
3. Пастки в скринях (`trap_details`) видаляються, якщо їхній `discovery_status == "hidden"`.
4. Справжня вартість та приховані магічні заряди непізнаних речей відсікаються.
