import request from 'supertest';
import app from '../src/app';
import { describe, it, expect } from 'vitest';

describe('Session Selection API Integration Tests', () => {
  it('should return 401 when accessing /sessions without cookies', async () => {
    const response = await request(app).get('/sessions');
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Session ID is missing');
  });

  it('should return 401 when accessing /sessions with an invalid session_id', async () => {
    const response = await request(app)
      .get('/sessions')
      .set('Cookie', 'session_id=invalid_session_id');

    // Якщо сесія не знайдена в БД, authService викине помилку,
    // і middleware поверне "Session ID is missing" (або іншу помилку залежно від логіки)
    // Наразі в middleware ми повертаємо "Session ID is missing" як загальну помилку для відсутніх даних
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Session ID is missing');
  });
});