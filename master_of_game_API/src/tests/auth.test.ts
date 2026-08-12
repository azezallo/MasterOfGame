import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app';
import { AuthRepository } from '../repositories/auth.repository';

describe('Auth Integration Tests (Register & Me Cookie Flow)', () => {
  let authRepo: AuthRepository;

  beforeAll(() => {
    authRepo = new AuthRepository();
  });

  afterAll(() => {
    // cleanup
  });

  it('should register a new user, automatically set session_id cookie, and allow immediate /auth/me access', async () => {
    const testLogin = `user_${Date.now()}`;
    const registerRes = await request(app)
      .post('/auth/register')
      .send({
        login: testLogin,
        password: 'Password123!',
      });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body.success).toBe(true);
    expect(registerRes.body.player).toBeDefined();
    expect(registerRes.body.player.login).toBe(testLogin);

    const cookies = registerRes.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const cookieHeader = cookies ? cookies[0] : '';
    expect(cookieHeader).toContain('session_id=');

    const meRes = await request(app)
      .get('/auth/me')
      .set('Cookie', [cookieHeader]);

    expect(meRes.status).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.player).toBeDefined();
    expect(meRes.body.player.login).toBe(testLogin);
  });

  it('should fail /auth/me with 401 when no session cookie is provided', async () => {
    const meRes = await request(app).get('/auth/me');

    expect(meRes.status).toBe(401);
    expect(meRes.body.success).toBe(false);
  });
});
