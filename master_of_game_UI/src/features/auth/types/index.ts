import { z } from 'zod';

export type AuthMode = 'login' | 'register';

export const RegisterSchema = z.object({
  login: z.string().min(3, 'Ім\'я користувача має бути не менше 3 символів'),
  password: z.string().min(6, 'Пароль має бути не менше 6 символів'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Паролі не збігаються",
  path: ["confirmPassword"],
});

export const LoginSchema = z.object({
  login: z.string().min(1, 'Ім\'я користувача є обов\'язковим'),
  password: z.string().min(1, 'Пароль є обов\'язковим'),
});

export interface RegisterData {
  login: string;
  password: string;
  confirmPassword: string;
}

export interface LoginData {
  login: string;
  password: string;
}

export interface AuthError {
  message: string;
  field?: string;
}

export interface AuthStatus {
  isLoading: boolean;
  error: AuthError | null;
  success: boolean;
}
