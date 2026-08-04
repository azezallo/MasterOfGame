import type { ZodSafeParseResult } from 'zod';

/**
 * Обробляє результати валідації Zod та повертає структуру помилки для UI.
 * @param result - Результат виконання safeParse від Zod
 * @returns Об'єкт помилки з повідомленням або null, якщо валідація успішна
 */
export const handleZodError = (result: ZodSafeParseResult<unknown>) => {
  if (result.success) return null;

  const firstError = result.error.issues[0];
  
  // Якщо повідомлення від Zod відсутнє, використовуємо загальне повідомлення
  const message = firstError.message || 'Валідація даних не вдалася';
  
  return {
    message,
    field: firstError.path[0] as string,
  };
};
