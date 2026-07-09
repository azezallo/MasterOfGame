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
    - Метод `initializeDB(playerId, sessionId)`: Створення файлу `.db` у структурі папок `saves/{playerId}/{sessionId}.db` та ініціалізація таблиць (`inventory`, `npcs`, `session_metadata`).
    - Методи для `inventory`: `saveItem`, `loadItem`, `updateItem`, `loadItems`.
    - Методи для `npcs`: `saveNPC`, `loadNPC`, `loadNPCs`.
    - Методи для `sessionMetadata`: `saveMetadata`, `loadMetadata`.
- [x] Впровадити механізм атомічного запису через `runTransaction`.

### Етап 3: Створення Service Layer (Persistence Service)
- [ ] Реалізувати `PersistenceService`:
    - `createSession(player_id)`: Генерування `session_id`, створення файлу `.db`, первинна ініціалізація.
    - `get_session_state(session_id)`: Агрегація даних з усіх таблиць у єдиний об'єкт стану.
    - `save_session_state(session_id, state)`: Розбиття об'єкта стану на частини та паралельний запис у відповідні таблиці.

### Етап 4: Тестування
- [ ] Створити модульні тести для `DatabaseRepository` (перевірка SQL-запитів, валідації JSON).
- [ ] Створити інтеграційні тести для `PersistenceService` (повний цикл створення сесії та збереження стану).
- [ ] Тест валідації JSON даних перед збереженням.
