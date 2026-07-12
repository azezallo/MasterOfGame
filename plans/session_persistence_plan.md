# План реалізації фічі: Система збереження сесій (Session Persistence)

## Огляд
Реалізація системи зберігання ігрових даних у файловій базі даних SQLite. Кожна сесія гравця матиме власний файл бази даних для забезпечення ізоляції та портативності.

## Етапи виконання

### Етап 1: Налаштування середовища та базових типів (Infrastructure)
- [x] Встановити необхідні залежності: `better-sqlite3`, `zod`, `dotenv`, `vitest`.
- [x] Створити базові типи даних (TypeScript interfaces/Zod schemas) для:
    - `PlayerState` (характеристики, інвентар).
    - `WorldState` (об'єкти, локації).
    - `SessionMetadata`.
- [x] Реалізувати модуль конфігурації для відносних шляхів до папки `saves/`.
- [x] Налаштувати базову структуру папок для тестування та виконання тестів.

### Етап 2: Створення Data Access Layer (Repositories)
- [x] Реалізувати `DatabaseRepository`:
    - Метод `initializeDB(session_id)`: Створення файлу `.db` та ініціалізація таблиць (`inventory`, `npcs`, `session_metadata`).
    - Методи для `inventory`: `saveItem`, `loadItem`, `updateItem`.
    - Методи для `npcs`: `saveNPC`, `loadNPC`.
    - Методи для `sessionMetadata`: `saveMetadata`, `loadMetadata`.
- [x] Впровадити механізм атомічного запису.

### Етап 3: Створення Service Layer (Persistence Service)
- [x] Реалізувати `PersistenceService`:
    - `createSession(player_id)`: Генерування `session_id`, створення файлу `.db`, первинна ініціалізація.
    - `get_session_state(session_id)`: Агрегація даних з усіх таблиць у единий об'єкт стану.
    - `save_session_state(session_id, state)`: Розбиття об'єкта стану на частини та паралельний запис у відповідні таблиці.

### Етап 4: Тестування
- [x] Створити модульні тести для `DatabaseRepository` (перевірка SQL-запитів, валідації JSON).
- [x] Створити інтеграційні тести для `PersistenceService` (повний цикл створення сесії та збереження стану).
- [x] Тест валідації JSON даних перед збереженням.
