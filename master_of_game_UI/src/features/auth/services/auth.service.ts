import { register, login, getMe } from '@/api/auth';
import type { RegisterData, LoginData } from '../types';
import type { RegisterResponse, LoginResponse, GetMeResponse } from '@/api/contracts/auth';

export const authService = {
  register: async (data: RegisterData): Promise<RegisterResponse> => {
    return await register({
      login: data.login,
      password: data.password,
    });
  },

  login: async (data: LoginData): Promise<LoginResponse> => {
    return await login(data);
  },

  getMe: async (): Promise<GetMeResponse> => {
    return await getMe();
  },
};
