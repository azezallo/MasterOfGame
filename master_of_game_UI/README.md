# Master of Game UI

Це клієнтська частина веб-додатку Master of Game — гри з Narrative-First інтерфейсом, де всі дії відбуваються через діалог з AI Master'ом.

## Технологічний стек

- **React** + **TypeScript**
- **Vite** для швидкої збірки
- **CSS Modules** для стилізації без конфліктів
- **Zod** для валідації даних
- Нативний `fetch` для роботи з API

## Запуск проєкту

Перед запуском переконайтесь, що у вас встановлено Node.js.

### Встановлення залежностей

```bash
npm install
```

### Запуск у режимі розробки

```bash
npm run dev
```

Додаток буде доступний за адресою `http://localhost:5173`.

### Збірка для production

```bash
npm run build
```

Зібраний додаток з'явиться в папці `dist`.

### Запуск лінтера

```bash
npm run lint
```

## Змінні середовища

Для роботи з API додаток використовує змінну `VITE_API_BASE_URL`.
Вона повинна бути вказана у файлі `.env.development` або `.env.production` в корені UI проєкту.

Приклад `.env.development`:
```
VITE_API_BASE_URL=http://localhost:3000
```
