# 🗺️ Code Review: `maps_generator`

Рев'ю кодової бази `maps_generator/` з фокусом на: архітектурну логічність, готовність до перенесення у продакшен, та "захламленість".

---

## Загальна оцінка

Кодова база функціонально працює і дає гарний результат — але вона в стані **"прототип, який пережив кілька ітерацій з різними агентами"**. Є значне дублювання, `any` типи скрізь, God-функції, і відсутність чіткої межі між генерацією та рендерингом.

> [!WARNING]
> **Головна проблема**: Код `index.ts` містить масивну функцію `compressPayload()` на 150 рядків з `any` типами, яка є центральним вузьким місцем. Стиснення, експорт, генерація — все змішане в одному файлі. Переносити це в основний проєкт в такому стані буде боляче.

---

## 1. Архітектурні проблеми

### 1.1. `index.ts` — God File (274 рядки)

[`index.ts`](file:///d:/My/MasterOfGame/maps_generator/src/index.ts) містить:
- Генерацію heightmap (inline, не винесено в layer)
- `compressPayload()` — складну функцію стиснення з `any` типами
- `exportData()` — серіалізацію
- `main()` — оркестрацію

**Рекомендація**: Розділити на:
| Файл | Відповідальність |
|------|-----------------|
| `src/pipeline.ts` | Оркестрація генерації (main) |
| `src/layers/elevation.ts` | Генерація heightmap |
| `src/compression.ts` | `compressPayload()` з типами |
| `src/export.ts` | Серіалізація в JS/JSON |

### 1.2. Немає спільних типів — `any` скрізь

[`compressPayload()`](file:///d:/My/MasterOfGame/maps_generator/src/index.ts#L56-L204) приймає `payload: any` і повертає `any`. Renderer'и теж працюють з `any`:
- [`renderMapToImage(mapData: any)`](file:///d:/My/MasterOfGame/maps_generator/src/render/mapRenderer.ts)
- [`generateRegionalMaps(payload: any)`](file:///d:/My/MasterOfGame/maps_generator/src/render/regionalRenderer.ts)

**Рекомендація**: Створити `src/types.ts`:
```typescript
export interface WorldData {
  config: MapGenerationConfig;
  elevation: number[][];
  temperature: number[][];
  moisture: number[][];
  biomes: BiomeType[][];
  rivers: boolean[][];
  lakes: boolean[][];
  magic: number[][];
  political: PoliticalResult;
}

export interface CompressedWorldData extends Omit<WorldData, 'rivers'> {
  // compressed variant
}
```

### 1.3. `config.ts` — Подвійна роль

[`config.ts`](file:///d:/My/MasterOfGame/maps_generator/src/config.ts) визначає і **інтерфейс** `MapGenerationConfig`, і **конкретний інстанс** `MapConfig` з хардкоднутими значеннями. Коли код перейде в основний проєкт, ці значення мають бути параметрами, а не константами.

**Рекомендація**: Тримати тільки інтерфейс в `config.ts`, а конкретні значення — в окремому `presets.ts` або передавати через CLI/API.

---

## 2. Дублювання коду

### 2.1. `mapRenderer.ts` ↔ `regionalRenderer.ts` — ~70% однакового коду

Це найбільша проблема. Обидва файли (~17KB + ~20KB) містять:

| Дублюється | `mapRenderer.ts` | `regionalRenderer.ts` |
|-----------|-------------------|----------------------|
| `loadImagesFromDir()` | ✅ ідентично | ✅ ідентично |
| `pseudoRandom()` | ✅ ідентично | ✅ ідентично |
| Asset scattering loop | ✅ (з `density * 4.0`) | ✅ (з `hashSeed`) |
| Water rendering | ✅ bilinear smoothing | ✅ simpler fill |
| Road drawing | ✅ roadMap grid | ✅ roadPaths vector |
| City/Settlement draw | ✅ | ✅ |
| Background load | ✅ | ✅ |

**Рекомендація**: Вилучити в:
- `src/render/assetLoader.ts` — `loadImagesFromDir()`, loading assets
- `src/render/scatterEngine.ts` — логіка розкидання asset'ів
- `src/render/roadRenderer.ts` — малювання доріг
- `src/render/renderUtils.ts` — `pseudoRandom()`, isNearWater, background loading

Кожен renderer стає тонкою обгорткою, яка конфігурує параметри і делегує спільному engine:

```typescript
// Спрощений приклад
const globalConfig: ScatterConfig = { densityMultiplier: 4.0, tileSize: 15 };
const regionalConfig: ScatterConfig = { densityMultiplier: 1.0, tileSize: 30 };
```

### 2.2. `pseudoRandom()` — 3 різні копії

Функція `pseudoRandom()` з `Math.sin()` дублюється у:
1. [`mapRenderer.ts`](file:///d:/My/MasterOfGame/maps_generator/src/render/mapRenderer.ts)
2. [`regionalRenderer.ts`](file:///d:/My/MasterOfGame/maps_generator/src/render/regionalRenderer.ts)
3. [`layers/political.ts`](file:///d:/My/MasterOfGame/maps_generator/src/layers/political.ts)
4. [`layers/magic.ts`](file:///d:/My/MasterOfGame/maps_generator/src/layers/magic.ts)
5. [`layers/hydrology.ts`](file:///d:/My/MasterOfGame/maps_generator/src/layers/hydrology.ts) (з іншою сигнатурою)

**Рекомендація**: Одна утиліта `src/math/random.ts`:
```typescript
export function pseudoRandom(seed: number, index: number): number { ... }
export function hashRandom(seed: number, x: number, y: number, extra: number): number { ... }
```

---

## 3. Viewer — Мертвий та живий код одночасно

### 3.1. Два покоління viewer'ів

У [`viewer/`](file:///d:/My/MasterOfGame/maps_generator/viewer) є **два покоління** коду:

**Старе покоління (DOM Grid)**:
- [`index.html`](file:///d:/My/MasterOfGame/maps_generator/viewer/index.html) — `<div id="map-container">`, CSS Grid, tile-by-tile DOM
- [`app.js`](file:///d:/My/MasterOfGame/maps_generator/viewer/app.js) — створює `div.tile` для кожного пікселя, tooltip по DOM елементах

**Нове покоління (SVG/Canvas)**:
- [`svg_map.html`](file:///d:/My/MasterOfGame/maps_generator/viewer/svg_map.html) — SVG з pre-rendered background
- [`svg_app.js`](file:///d:/My/MasterOfGame/maps_generator/viewer/svg_app.js) — SVG + convex hull + pan/zoom
- [`regional_map.html`](file:///d:/My/MasterOfGame/maps_generator/viewer/regional_map.html) / [`regional_app.js`](file:///d:/My/MasterOfGame/maps_generator/viewer/regional_app.js) — SVG regions + provinces

> [!IMPORTANT]
> Старий DOM Grid viewer (`index.html` + `app.js`) завантажує **55MB `map_data.js`** (оригінальна 1x мапа 600×1000). Він по суті непрацездатний для поточного розміру карти і створює **600,000 DOM елементів**. Як debug-тул він теж марний бо браузер просто зависає.

**Рекомендація**: 
- Видалити `index.html` + `app.js` (старий DOM Grid viewer) або перевести на Canvas
- Залишити тільки SVG-based viewer'и

### 3.2. Pan/Zoom дублюється у кожному JS

Код для pan & zoom (~30 рядків) копіпаститься в [`svg_app.js`](file:///d:/My/MasterOfGame/maps_generator/viewer/svg_app.js) і [`regional_app.js`](file:///d:/My/MasterOfGame/maps_generator/viewer/regional_app.js) ідентично.

**Рекомендація**: Вилучити в `viewer/lib/panZoom.js`.

### 3.3. Tooltip стилі дублюються

CSS для tooltip, header, SVG стилі дублюються в кожному HTML файлі.

**Рекомендація**: `viewer/styles/common.css`.

---

## 4. Output — `out/` директорія

### 4.1. 143 файли, ~120MB

[`out/`](file:///d:/My/MasterOfGame/maps_generator/out) містить:
- `map_data.js` — **55MB** (!) — оригінальне джерело істини
- `global_map_data.js` — 290KB
- 70+ `region_*.jpg` — ~200-800KB кожен
- 70+ `region_*_data.js` — ~150-600KB кожен
- `rendered_map.jpg` — 300KB

> [!CAUTION]
> `map_data.js` — це 55MB JSON обгорнутий у `const mapData = ...;`. Це `.js` файл, який viewer завантажує через `<script src>`. Для реального продакшена — неприйнятно. Але для лабораторії — працює, поки не забувати додати `out/` в `.gitignore`.

**Рекомендація**: Переконатися, що `out/` у `.gitignore`. Розглянути JSON + lazy loading замість гігантських JS файлів.

### 4.2. Дані регіонів використовують різні формати

`global_map_data.js` записується як `const mapData = ...`, а `region_*_data.js` як `const regionData = ...`. При цьому обидва мають різну структуру і різні назви полів. Це ускладнює розуміння viewer'ом, що звідки приходить.

---

## 5. Якість коду — технічний борг

### 5.1. Biome enum визначений у двох місцях

- [`src/layers/biomes.ts`](file:///d:/My/MasterOfGame/maps_generator/src/layers/biomes.ts#L1-L17) — `export enum BiomeType` (OCEAN, BEACH, CLIFF, SCORCHED, BARE, TUNDRA, SNOW, TAIGA, SHRUBLAND, GRASSLAND, TEMPERATE_DESERT, ...)
- [`src/render/mapRenderer.ts`](file:///d:/My/MasterOfGame/maps_generator/src/render/mapRenderer.ts) та [`src/render/regionalRenderer.ts`](file:///d:/My/MasterOfGame/maps_generator/src/render/regionalRenderer.ts) — обидва використовують biome рядки напряму (`'SNOW'`, `'TUNDRA'`) без імпорту BiomeType

Renderer'и працюють зі string biomes через `any` типи, тому TypeScript не перевіряє відповідність. Якщо хтось перейменує біом в enum — renderer'и зламаються тихо.

### 5.2. `PerlinNoise.fbm()` — різні сигнатури

[`perlin.ts`](file:///d:/My/MasterOfGame/maps_generator/src/math/perlin.ts) — `fbm()` приймає 6 позиційних аргументів:
```typescript
fbm(x, y, octaves, persistence, lacunarity, scale)
```

Але документація в `06_new_map_concept.md` і код нових рендерерів (з першого покоління субагентів) використовували options object `fbm(x, y, { octaves, ... })`. Це показує, що код модифікувався різними агентами без консистентності.

### 5.3. Хардкод magic numbers

У renderer'ах повно хардкоднутих чисел:
- `BASE_ASSET_HEIGHT = 25` / `32`
- `density * 4.0` (глобальна) vs raw density (регіональна)
- `0.005` density для монстрів
- `sizeMult = 2.0` / `4.0` для морських створінь

Ці значення треба винести в конфігурацію рендеру.

### 5.4. `distance()` функція дублюється

Функція `distance(x1, y1, x2, y2)` написана ідентично в:
1. [`political.ts`](file:///d:/My/MasterOfGame/maps_generator/src/layers/political.ts)
2. [`magic.ts`](file:///d:/My/MasterOfGame/maps_generator/src/layers/magic.ts)

---

## 6. Документація — `doc/`

### 6.1. Застарілі плани

[`doc/01_plan_setup_and_noise.md`](file:///d:/My/MasterOfGame/maps_generator/doc/01_plan_setup_and_noise.md) до [`doc/05_plan_export.md`](file:///d:/My/MasterOfGame/maps_generator/doc/05_plan_export.md) — це плани етапів, які вже **повністю виконані**. Вони описують речі як "Створити `package.json`" і "Реалізація класичного алгоритму шуму".

**Рекомендація**: Перенести в `doc/archive/` або видалити. Залишити тільки:
- `doc/06_new_map_concept.md` — актуальне бачення
- `doc/walkthrough.md` — стан речей

### 6.2. `walkthrough.md` — непоганий, але неповний

[`walkthrough.md`](file:///d:/My/MasterOfGame/maps_generator/doc/walkthrough.md) описує що зроблено та наступні кроки, але не описує **поточну структуру коду** і **як його запускати**. Для лабораторії, де "агент передає роботу іншому агенту", це критично.

---

## 7. Рекомендації для підготовки до перенесення

### Високий пріоритет (зробити зараз)

| # | Дія | Причина |
|---|-----|---------|
| 1 | Вилучити спільні утиліти (`pseudoRandom`, `distance`, `loadImagesFromDir`) | Дублювання в 5 місцях |
| 2 | Створити `src/types.ts` — спільні типи для WorldData | `any` скрізь — бомба уповільненої дії |
| 3 | Вилучити heightmap з `index.ts` → `layers/elevation.ts` | Consistency з іншими layers |
| 4 | Вилучити `compressPayload()` з `index.ts` → `src/compression.ts` | index.ts — 274 рядки God File |
| 5 | Видалити/архівувати `doc/01-05` | Захламлення |

### Середній пріоритет (перед перенесенням)

| # | Дія | Причина |
|---|-----|---------|
| 6 | Рефактор renderers — спільний scatter engine | ~600 рядків дублювання |
| 7 | Видалити старий DOM Grid viewer (`index.html` + `app.js`) | Мертвий код, 55MB завантаження |
| 8 | Перевести biome рядки в renderer'ах на BiomeType enum | Тихі баги при перейменуванні |
| 9 | Вилучити Pan/Zoom + tooltip в спільні модулі viewer'а | Копіпаста між viewer'ами |
| 10 | Додати `out/` в `.gitignore` | 120MB артефактів |

### Низький пріоритет (nice to have)

| # | Дія | Причина |
|---|-----|---------|
| 11 | Замінити `.js` data files на `.json` + fetch | Уникнути CORS хаків |
| 12 | Винести магічні числа в render config | Налаштовуваність |
| 13 | Зробити seed параметром, а не хардкодом | Відтворюваність |

---

## 8. Підсумок

```
Кодова база: ★★★☆☆ (працює, але не готова до перенесення)
Архітектура:  ★★☆☆☆ (God file, any-typed, дублювання)
Документація: ★★★☆☆ (concept добрий, плани застарілі)
Viewer:       ★★★☆☆ (SVG viewer працює, DOM viewer мертвий)
```

Загальна рекомендація: **провести один рефактор-спринт перед продовженням розробки Level 3**. Інакше кожен новий рівень (провінції, міста, підземелля) буде множити дублювання і робити перенесення все складнішим.
