import { register, login, getMe } from '@/api/auth';
import type { RegisterData, LoginData, AuthStatus } from '../types';
import { setCookie, getCookie } from '@/utils/cookies';

export const authService = {
  register: async (data: RegisterData): Promise<any> => {
    return await register({
      login: data.login,
      password: data.password,
    });
  },

  login: async (data: LoginData): Promise<any> => {
    const response = await login(data);
    // If token is in body, we save it.
    if (response.token) {
      setCookie('auth_token', response.token, { expires: 7, path: '/' });
    }
    return response;
  },

  getMe: async (): Promise<any> => {
    const token = getCookie('auth_token');
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
    return await getMe({}, headers);
  },

  isAuthenticated: (): boolean => {
    return !!getCookie('auth_token');
  }
};
