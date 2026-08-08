# Code Review: F006 — Інструменти Агента: Мапа

**Дата**: 2026-08-09  
**Рев'юер**: AI Code Reviewer  
**Статус**: 🔴 Потребує виправлень (Changes Requested)

---

## Резюме

Фіча реалізує базову інфраструктуру для системи локацій:
- **Backend**: `locations` таблиця в SQLite, CRUD-шари (Repository → Service → Controller → Route), генератор початкової карти, Zod-схеми.
- **Frontend**: `EnvironmentSidebar` (панель оточення), `InteractiveMapModal` (модальна карта), `LocationBreadcrumbHeader`, API-клієнт, типи, i18n.
- **Session Creation**: Додано вибір розміру карти (`mapSize`).

**Загальне враження**: Код у правильному напрямку, але є кілька серйозних архітектурних порушень та багів, які блокують мердж.

---

## 🔴 Критичні зауваження (Blocker)

### 1. Невикористаний імпорт `locationRoutes` в `app.ts`

**Файл**: [`app.ts`](file:///d:/My/MasterOfGame/master_of_game_API/src/app.ts#L7)

Рядок `import locationRoutes from './routes/location.routes';` доданий до `app.ts`, але **ніде не використовується** (відсутній `app.use()`). Роутинг фактично працює через вкладення в `session.routes.ts` (що правильно), але «висячий» імпорт:
- Засмічує код і збиває з пантелику.
- Залежно від конфігурації TS/ESLint, може призводити до помилок лінтера.

**Фікс**: Видалити зайвий імпорт з `app.ts`.

```diff
- import locationRoutes from './routes/location.routes';
```

---

### 2. Порушення Layered Architecture: бізнес-логіка в контролері

**Файл**: [`location.controller.ts`](file:///d:/My/MasterOfGame/master_of_game_API/src/controllers/location.controller.ts#L17-L48)

Контролер виконує роботу, яка належить Service Layer:
1. **L17**: Інстанціює `PersistenceService` вручну (відсутність DI).
2. **L23**: Безпосередньо викликає `repo.getDb()` — контролер знає про деталі реалізації бази даних (порушення абстракції).
3. **L28**: Сам створює `LocationRepository` і `LocationService`.
4. **L38-47**: Вручну маппить дані, об'єднуючи координати з відповіддю `getLocationContext` — це пряма трансформація/бізнес-логіка, заборонена згідно з `backend_principles.md`, розділ "Routing Layer":
   > «**Заборонено**: Містити будь-яку бізнес-логіку або прямі запити до бази даних.»

**Фікс**: Створити метод у `LocationService` (наприклад, `getMapTiles(parentId)`) який:
- Приймає `parentId`.
- Сам витягує локації з репозиторію.
- Фільтрує `hidden` переходи.
- Повертає вже безпечну структуру з координатами.

Контролер повинен лише:
1. Витягти параметри з `req`.
2. Отримати сервіс.
3. Викликати `service.getMapTiles(parentId)`.
4. Повернути `res.json(...)`.

---

### 3. Масивна бізнес-логіка та data fetching в UI-компоненті `RightSidebar`

**Файл**: [`RightSidebar.tsx`](file:///d:/My/MasterOfGame/master_of_game_UI/src/features/chat/components/Sidebars/RightSidebar.tsx)

Весь стейт-менеджмент, API-запити (`useEffect` + `fetch`), та навігаційна логіка map drill-down (history, breadcrumb, back) вбудовані прямо в презентаційний компонент. Це порушує `frontend_principles.md`:

> **Presentation Layer**: «**Заборонено**: Містити прямі запити до API (fetch/axios), складну бізнес-логіку або пряму трансформацію сирих даних з бекенду. Компонент має бути максимально "дурним" (Dumb Component)».

> **Logic Layer (Custom Hooks)**: «Керування локальним станом, обробка подій, координація між глобальним стейтом та сервісами запитів.»

**Фікс**: Виділити хук `useMapNavigation(sessionId)`, який інкапсулює:
- `locations`, `currentLocation`, `isLoading` — стани.
- `handleLocationSelect`, `handleMapBack`, `handleBreadcrumbClick` — обробники.
- `mapHistory`, `currentMapContext`, `isMapOpen`, `toggleMap` — стани мапи.

`RightSidebar` лише деструктурує результат хука та рендерить дочірні компоненти.

---

### 4. `EnvironmentSidebar` не використовує i18n — хардкод українського тексту

**Файл**: [`EnvironmentSidebar.tsx`](file:///d:/My/MasterOfGame/master_of_game_UI/src/features/map/components/EnvironmentSidebar/EnvironmentSidebar.tsx#L27-L93)

Усі рядки в компоненті («Оточення», «Виходи», «Присутні», «Нікого немає», «Відкрито», «Замкнено» тощо) захардкоджені українською. Проєкт використовує `react-i18next` і файл `uk.json`. Для консистентності всі рядки повинні проходити через `t()`.

**Фікс**: Замінити всі хардкоджені рядки на ключі i18n.

---

### 5. `InteractiveMapModal` — хардкоджений текст + невикористаний проп `sessionId`

**Файл**: [`InteractiveMapModal.tsx`](file:///d:/My/MasterOfGame/master_of_game_UI/src/features/map/components/InteractiveMapModal/InteractiveMapModal.tsx)

- **L91-93**: «⬅️ Назад», «Повернутися на рівень вище» — хардкод.
- **L99**: «Світ» — хардкод.
- **L129-131**: «Тут нічого немає.» — хардкод.
- Проп `sessionId` оголошений в інтерфейсі (непрямо через `RightSidebar`), але **не використовується** всередині компонента. Видалити або використовувати.
- **L16-17**: Імпорт `useTranslation` знаходиться **після** оголошення інтерфейсу, між `interface` та `export const`. Це не є помилкою, але порушує стандартний порядок імпортів (усі `import` мають бути на початку файлу).

---

## 🟠 Серйозні зауваження (Major)

### 6. Відсутня валідація вхідних даних в контролері `getMapLocations`

**Файл**: [`location.controller.ts`](file:///d:/My/MasterOfGame/master_of_game_API/src/controllers/location.controller.ts#L10)

Параметри `sessionId` та `parent_location_id` беруться з `req.params` / `req.query` без валідації через Zod. Згідно `backend_principles.md`:
> «Валідація вхідних даних на рівні контролерів за допомогою **Zod**.»

**Фікс**: Створити Zod-схему для query-параметрів і валідувати.

---

### 7. `MapGeneratorService` не використовує параметр `seed`

**Файл**: [`map_generator.service.ts`](file:///d:/My/MasterOfGame/master_of_game_API/src/services/map_generator.service.ts#L9)

Сігнатура `generateWorld(size, seed?)` приймає `seed`, але він ніде не використовується. Генерація використовує `Math.random()`, що робить карту недетермінованою.

> [!NOTE]
> Складна генерація (Perlin noise, seed-based PRNG) винесена в окрему задачу **F019** (Backlog). Для F006 це не є блокером.

**Фікс**: Видалити невикористаний параметр `seed` із сігнатури, щоб не вводити в оману. Додати `// TODO [F019]: Implement seed-based PRNG`.

---

### 8. `MapGeneratorService` ігнорує `size.y` — використовує лише `size.x`

**Файл**: [`map_generator.service.ts`](file:///d:/My/MasterOfGame/master_of_game_API/src/services/map_generator.service.ts#L10)

```typescript
const gridDimension = size.x; // using x as the dimension for the square grid
```

Параметр `mapSize` має `{ x, y }`, але `y` повністю ігнорується — сітка завжди квадратна. Це або баг, або потрібно змінити інтерфейс до `{ size: number }`.

**Фікс**: Використовувати обидва виміри `(size.x, size.y)` для прямокутних карт.

---

### 9. Пошук локації за `Array.find()` замість Map/Index

**Файл**: [`map_generator.service.ts`](file:///d:/My/MasterOfGame/master_of_game_API/src/services/map_generator.service.ts#L59)

```typescript
const currentLoc = locations.find(l => l.location_id === currentLocId);
```

Це O(n) на кожну ітерацію вкладеного циклу. Для великих карт (7×7 = 49 тайлів, з 4 сусідами кожен = ~200 викликів `find`) це не критично, але для `large` карт або майбутніх розмірів це стане проблемою.

**Фікс**: Використати `Map<string, LocationData>` для O(1) доступу.

---

### 10. `DatabaseRepository.getDb()` порушує інкапсуляцію

**Файл**: [`database_repository.ts`](file:///d:/My/MasterOfGame/master_of_game_API/src/persistence/database_repository.ts#L118-L120)

Новий публічний метод `getDb()` повертає сирий об'єкт `better-sqlite3`. Це дозволяє обійти весь Data Access Layer і виконувати довільні запити, порушуючи:
> «**Data Access Layer (Repositories)**: Абстракція доступу до даних.»

**Фікс**: Замість того щоб віддавати сиру БД, створити фабричний метод на рівні `DatabaseRepository` або `PersistenceService`:

```typescript
// В PersistenceService або DatabaseRepository
public getLocationRepository(): LocationRepository {
  if (!this.db) throw new Error('DB not initialized');
  return new LocationRepository(this.db);
}
```

---

### 11. `@ts-ignore` в `App.tsx` — тимчасове рішення

**Файл**: [`App.tsx`](file:///d:/My/MasterOfGame/master_of_game_UI/src/App.tsx#L8)

```typescript
// @ts-ignore: 'openPopup' is declared but its value is never read.
```

> [!NOTE]
> Це тимчасове рішення: `openPopup` прив'язаний до закоментованої кнопки, яка використовується для перегляду стилів компонентів дизайн-системи в одному місці. Буде видалено разом із кнопкою.

**Фікс**: Додати коментар `// TEMPORARY: Design system preview — remove with the preview button` біля `@ts-ignore`, щоб наступний розробник розумів контекст.

---

### 12. Дублювання типів `LocationData` між бекендом та фронтендом

**Файли**:
- Backend: [`location.types.ts`](file:///d:/My/MasterOfGame/master_of_game_API/src/types/location.types.ts)
- Frontend: [`location.ts`](file:///d:/My/MasterOfGame/master_of_game_UI/src/types/location.ts)

Типи практично ідентичні, але фронтенд версія визначена вручну через `interface`, а бекенд — через `z.infer`. Це створює ризик розсинхронізації при зміні схеми. 

**Рекомендація**: Для MVP це прийнятно, але розглянути спільний пакет типів або автогенерацію з Zod-схем у майбутньому. Додати `// TODO: Auto-generate from backend Zod schema` як маркер.

---

### 13. Двічі реєстрований маршрут для `/`

**Файл**: [`location.routes.ts`](file:///d:/My/MasterOfGame/master_of_game_API/src/routes/location.routes.ts#L8-L9)

```typescript
router.get('', getMapLocations);
router.get('/', getMapLocations);
```

Маршрут зареєстрований двічі — з порожнім рядком та зі слешем. Це зайво. Express обробить обидва варіанти через один обробник.

**Фікс**: Залишити лише `router.get('/', getMapLocations);`.

---

## 🟡 Незначні зауваження (Minor / Suggestions)

### 14. Inline styles у `RightSidebar` та `InteractiveMapModal`

Масивні `style={{...}}` об'єкти прямо в JSX (наприклад, кнопка "Відкрити мапу" з 7+ CSS-властивостями). Згідно `frontend_principles.md`:
> «**CSS Modules**: Використовувати CSS Modules як основний метод стилізації.»

**Фікс**: Винести стилі в відповідні `.module.css` файли.

---

### 15. `console.log` у mockChatApi — debug-код

**Файл**: [`mockChatApi.ts`](file:///d:/My/MasterOfGame/master_of_game_UI/src/features/chat/api/mockChatApi.ts)

Додано `console.log("Session ID", sessionId)` та `console.log("Message", content)`. Це debug-код, який не повинен потрапляти в коміт.

**Фікс**: Видалити або замінити на структуроване логування.

---

### 16. `calculateDistance` повертає magic number `10`

**Файл**: [`location.service.ts`](file:///d:/My/MasterOfGame/master_of_game_API/src/services/location.service.ts#L80)

```typescript
return 10; // For topological graph distance, we'd need pathfinding (A*)
```

Fallback у 10 тайлів — це `magic number`. Краще кинути помилку `NotImplementedError` або повернути `null` з відповідним типом.

---

### 17. `movePlayer` — TODO без реалізації

**Файл**: [`location.service.ts`](file:///d:/My/MasterOfGame/master_of_game_API/src/services/location.service.ts#L83-L90)

Метод лише логує в `console.log`. Це допустимо для першої ітерації, але:
- Відсутній `sessionId` у сигнатурі.
- Немає прив'язки до `PersistenceService`.

**Рекомендація**: Позначити як `// TODO [F006]: Implement player movement with time progression`.

---

### 18. `LocationBreadcrumbHeader` створений, але не використовується

**Файл**: [`LocationBreadcrumbHeader.tsx`](file:///d:/My/MasterOfGame/master_of_game_UI/src/features/map/components/LocationBreadcrumbHeader/LocationBreadcrumbHeader.tsx)

Компонент та його CSS створені, але ніде не імпортуються. Замість нього в `InteractiveMapModal` реалізований інлайн-breadcrumb. Або інтегрувати компонент, або видалити мертвий код.

---

### 19. Розміщення файлу `api/location.ts` порушує feature-based структуру

**Файл**: [`src/api/location.ts`](file:///d:/My/MasterOfGame/master_of_game_UI/src/api/location.ts)

Згідно `frontend_principles.md`, API-запити специфічні для фічі повинні знаходитися всередині фічі:
> `features/map/api/location.ts`

А не в глобальному `src/api/`.

---

### 20. `error` проп у `SessionCreationForm` змінено з optional на required

**Файл**: [`SessionCreationForm.tsx`](file:///d:/My/MasterOfGame/master_of_game_UI/src/features/session_creation/components/SessionCreationForm.tsx#L12)

```diff
- error?: string | null;
+ error: string | null;
```

Це breaking change для всіх місць, де цей компонент використовується без передачі `error`. Переконатися, що всі виклики оновлені.

---

## ✅ Що зроблено добре

1. **Zod-схеми** (`location.schema.ts`) — добре структуровані, відповідають специфікації `location_data_schema.md`.
2. **Repository pattern** (`LocationRepository`) — чистий CRUD, правильна абстракція SQL.
3. **Фільтрація hidden переходів** у `LocationService.getLocationContext()` — коректно реалізована відповідно до специфікації.
4. **Метод `revealLocationSecret`** — правильно оновлює і секрет, і відповідний transition.
5. **CSS Modules** для нових компонентів (`EnvironmentSidebar`, `InteractiveMapModal`) — правильний підхід.
6. **AbortController** в `useEffect` у `RightSidebar` — правильна обробка race conditions.
7. **`mergeParams: true`** в `location.routes.ts` — коректне рішення для вкладеного роутингу.
8. **i18n** для нових ключів у `uk.json` — правильний підхід (хоча не всі компоненти його використовують).

---

## 📋 Чек-лист для виправлень

| # | Пріоритет | Опис | Файл |
|---|-----------|------|------|
| 1 | 🔴 Blocker | Видалити невикористаний імпорт `locationRoutes` з `app.ts` | `app.ts` |
| 2 | 🔴 Blocker | Винести бізнес-логіку з контролера в `LocationService` | `location.controller.ts` |
| 3 | 🔴 Blocker | Виділити хук `useMapNavigation` з `RightSidebar` | `RightSidebar.tsx` |
| 4 | 🔴 Blocker | Прибрати хардкод i18n-рядків з `EnvironmentSidebar` | `EnvironmentSidebar.tsx` |
| 5 | 🔴 Blocker | Прибрати хардкод + невикористаний проп з `InteractiveMapModal` | `InteractiveMapModal.tsx` |
| 6 | 🟠 Major | Додати Zod-валідацію в контролер | `location.controller.ts` |
| 7 | 🟡 Minor | Видалити невикористаний параметр `seed` (генерація → F019) | `map_generator.service.ts` |
| 8 | 🟠 Major | Використовувати `size.y` або змінити інтерфейс | `map_generator.service.ts` |
| 9 | 🟠 Major | Оптимізувати `find()` → `Map` | `map_generator.service.ts` |
| 10 | 🟠 Major | Прибрати `getDb()`, додати фабрику | `database_repository.ts` |
| 11 | 🟡 Minor | Додати коментар-пояснення до тимчасового `@ts-ignore` | `App.tsx` |
| 12 | 🟠 Major | Додати TODO-маркер для типів | `location.ts` (frontend) |
| 13 | 🟠 Major | Видалити дубльований маршрут | `location.routes.ts` |
| 14 | 🟡 Minor | Замінити inline styles на CSS Modules | `RightSidebar.tsx`, `InteractiveMapModal.tsx` |
| 15 | 🟡 Minor | Видалити debug `console.log` | `mockChatApi.ts` |
| 16 | 🟡 Minor | Замінити magic number на `null` / помилку | `location.service.ts` |
| 17 | 🟡 Minor | Додати TODO-маркер для `movePlayer` | `location.service.ts` |
| 18 | 🟡 Minor | Використати або видалити `LocationBreadcrumbHeader` | Мертвий компонент |
| 19 | 🟡 Minor | Перемістити `api/location.ts` → `features/map/api/` | Frontend |
| 20 | 🟡 Minor | Переконатися що breaking change `error` пропа не ламає нічого | `SessionCreationForm.tsx` |
