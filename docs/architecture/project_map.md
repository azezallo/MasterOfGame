# Карта Проєкту (Project Map)

Цей документ є візуальним індексом і картою структури проєкту **Master of Game**. Він містить клікабельні посилання на всі основні директорії та важливі файли.

---

## 1. Документація та Візія (`docs/`)

- 📘 **Vision (Візія та Глосарій)**
  - [`glossary.md`](file:///d:/My/MasterOfGame/docs/vision/glossary.md) — Термінологія гри (AI Master, Narrative-First UI, Sovereign AI Master).
  - [`principles.md`](file:///d:/My/MasterOfGame/docs/vision/principles.md) — Основні принципи дизайну та філософія розробки.
  - [`project_overview.md`](file:///d:/My/MasterOfGame/docs/vision/project_overview.md) — Загальний огляд проєкту.

- 📐 **Architecture (Архітектура)**
  - [`backend_principles.md`](file:///d:/My/MasterOfGame/docs/architecture/backend_principles.md) — Архітектурні стандарти API (Node.js/Express/SQLite).
  - [`frontend_principles.md`](file:///d:/My/MasterOfGame/docs/architecture/frontend_principles.md) — Архітектурні стандарти UI (React/Vite/TS/CSS Modules).
  - [`project_map.md`](file:///d:/My/MasterOfGame/docs/architecture/project_map.md) — Ця карта проєкту.

- 🗺️ **Features & Roadmap (Фічі та Дорожня Карта)**
  - [`roadmap.md`](file:///d:/My/MasterOfGame/docs/features/roadmap.md) — Повний список фіч (F001–F019), їхні статуси та пріоритети.
  - **Специфікації (`docs/features/specs/`)**:
    - [`session_persistence.md`](file:///d:/My/MasterOfGame/docs/features/specs/session_persistence.md) (F001)
    - [`auth.md`](file:///d:/My/MasterOfGame/docs/features/specs/auth.md) (F002)
    - [`session_creation.md`](file:///d:/My/MasterOfGame/docs/features/specs/session_creation.md) (F003)
    - [`session_selection.md`](file:///d:/My/MasterOfGame/docs/features/specs/session_selection.md) (F004)
    - [`agent_tools_npc.md`](file:///d:/My/MasterOfGame/docs/features/specs/agent_tools_npc.md) & [`npc_data_schema.md`](file:///d:/My/MasterOfGame/docs/features/specs/npc_data_schema.md) (F005)
    - [`agent_tools_map.md`](file:///d:/My/MasterOfGame/docs/features/specs/agent_tools_map.md) & [`location_data_schema.md`](file:///d:/My/MasterOfGame/docs/features/specs/location_data_schema.md) (F006)
    - [`agent_tools_property.md`](file:///d:/My/MasterOfGame/docs/features/specs/agent_tools_property.md) & [`property_data_schema.md`](file:///d:/My/MasterOfGame/docs/features/specs/property_data_schema.md) (F007)
    - [`agent_tools_world_state.md`](file:///d:/My/MasterOfGame/docs/features/specs/agent_tools_world_state.md) (F008)
    - [`agent_tools_player_state.md`](file:///d:/My/MasterOfGame/docs/features/specs/agent_tools_player_state.md) (F009)
    - [`agent_tools_organizations.md`](file:///d:/My/MasterOfGame/docs/features/specs/agent_tools_organizations.md) (F011)
    - [`agent_tools_agentic_loop.md`](file:///d:/My/MasterOfGame/docs/features/specs/agent_tools_agentic_loop.md) (F012)
    - [`ui_chat_interface.md`](file:///d:/My/MasterOfGame/docs/features/specs/ui_chat_interface.md) (F013)
    - [`agent_tools_item.md`](file:///d:/My/MasterOfGame/docs/features/specs/agent_tools_item.md) & [`item_data_schema.md`](file:///d:/My/MasterOfGame/docs/features/specs/item_data_schema.md) (F014)
    - [`agent_tools_magic.md`](file:///d:/My/MasterOfGame/docs/features/specs/agent_tools_magic.md) (F015)
    - [`agent_tools_semantic_memory.md`](file:///d:/My/MasterOfGame/docs/features/specs/agent_tools_semantic_memory.md) (F017)
    - [`agent_tools_universal_rag.md`](file:///d:/My/MasterOfGame/docs/features/specs/agent_tools_universal_rag.md) (F018)

---

## 2. Серверна частина (`master_of_game_API/`)

Розробка серверної частини на Node.js, Express, TypeScript, SQLite (better-sqlite3) та Zod.

- 📁 **Конфігурація та точка входу**:
  - [`package.json`](file:///d:/My/MasterOfGame/master_of_game_API/package.json) — Залежності та скрипти сервера.
  - [`tsconfig.json`](file:///d:/My/MasterOfGame/master_of_game_API/tsconfig.json) — Налаштування TypeScript.
  - [`src/index.ts`](file:///d:/My/MasterOfGame/master_of_game_API/src/index.ts) — Запуск сервера.
  - [`src/app.ts`](file:///d:/My/MasterOfGame/master_of_game_API/src/app.ts) — Ініціалізація Express додатка та middleware.

- 📁 **Основний код (`master_of_game_API/src/`)**:
  - [`controllers/`](file:///d:/My/MasterOfGame/master_of_game_API/src/controllers) — Обробники HTTP-запитів.
  - [`services/`](file:///d:/My/MasterOfGame/master_of_game_API/src/services) — Бізнес-логіка, агентний цикл, інструменти ШІ-Майстра.
  - [`repositories/`](file:///d:/My/MasterOfGame/master_of_game_API/src/repositories) — Доступ до баз даних SQLite.
  - [`models/`](file:///d:/My/MasterOfGame/master_of_game_API/src/models) — Моделі даних.
  - [`routes/`](file:///d:/My/MasterOfGame/master_of_game_API/src/routes) — Ендпоінти REST API.
  - [`schemas/`](file:///d:/My/MasterOfGame/master_of_game_API/src/schemas) — Схеми валідації Zod.
  - [`persistence/`](file:///d:/My/MasterOfGame/master_of_game_API/src/persistence) — Управління збереженням сесій і баз даних.

---

## 3. Клієнтська частина (`master_of_game_UI/`)

Розробка Narrative-First UI на React, Vite, TypeScript та CSS Modules.

- 📁 **Конфігурація та точка входу**:
  - [`package.json`](file:///d:/My/MasterOfGame/master_of_game_UI/package.json) — Залежності та скрипти UI.
  - [`vite.config.ts`](file:///d:/My/MasterOfGame/master_of_game_UI/vite.config.ts) — Налаштування Vite.
  - [`src/main.tsx`](file:///d:/My/MasterOfGame/master_of_game_UI/src/main.tsx) — Точка монтування React.
  - [`src/App.tsx`](file:///d:/My/MasterOfGame/master_of_game_UI/src/App.tsx) — Головний компонент додатка.

- 📁 **Основний код (`master_of_game_UI/src/`)**:
  - [`components/`](file:///d:/My/MasterOfGame/master_of_game_UI/src/components) — Повторно використовувані UI компоненти.
  - [`features/`](file:///d:/My/MasterOfGame/master_of_game_UI/src/features) — Фічі додатка (Auth, Sessions, Chat, Inventory/Property).
  - [`api/`](file:///d:/My/MasterOfGame/master_of_game_UI/src/api) — Клієнти для взаємодії з REST API.
  - [`context/`](file:///d:/My/MasterOfGame/master_of_game_UI/src/context) — React Context для стану гри та сесії.
  - [`styles/`](file:///d:/My/MasterOfGame/master_of_game_UI/src/styles) — Глобальні стилі та CSS модулі.

---

## 4. Конфігурація Агентів (`.agents/`)

- [`AGENTS.md`](file:///d:/My/MasterOfGame/.agents/AGENTS.md) — Правила проєкту, гайдлайни, технологічний стек та мовна політика.
- **Навички та Субагенти (`.agents/skills/`)**:
  - [`tech_lead`](file:///d:/My/MasterOfGame/.agents/skills/tech_lead/SKILL.md) — Головний оркестратор фіч.
  - [`system_architect`](file:///d:/My/MasterOfGame/.agents/skills/system_architect/SKILL.md) — Планування та архітектура.
  - [`frontend_engineer`](file:///d:/My/MasterOfGame/.agents/skills/frontend_engineer/SKILL.md) — Розробка UI.
  - [`backend_engineer`](file:///d:/My/MasterOfGame/.agents/skills/backend_engineer/SKILL.md) — Розробка API.
  - [`code_reviewer`](file:///d:/My/MasterOfGame/.agents/skills/code_reviewer/SKILL.md) — Аудит коду та дотримання лору.
