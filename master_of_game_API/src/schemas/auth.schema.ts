import { z } from 'zod';

export const RegisterSchema = z.object({
  login: z.string().min(3).max(50),
  password: z.string().min(8).max(100),
});

export const LoginSchema = z.object({
  login: z.string().min(3).max(50),
  password: z.string().min(8).max(100),
});

export const GetMeSchema = z.object({});
