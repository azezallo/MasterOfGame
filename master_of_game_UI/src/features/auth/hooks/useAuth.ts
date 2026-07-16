import { useState, useEffect } from 'react';
import { RegisterSchema, LoginSchema } from '../types';
import type { RegisterData, LoginData, AuthError, AuthMode } from '../types';
import { authService } from '../services/auth.service';
import { handleZodError } from '@/utils/zod';

export const useAuth = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const [user, setUser] = useState<any>(null);

  const [registerData, setRegisterData] = useState<RegisterData>({
    login: '',
    password: '',
    confirmPassword: '',
  });

  const [loginData, setLoginData] = useState<LoginData>({
    login: '',
    password: '',
  });

  const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setRegisterData(prev => ({ ...prev, [name]: value }));
  };

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginData(prev => ({ ...prev, [name]: value }));
  };

  const handleRegister = async () => {
    setError(null);
    const result = RegisterSchema.safeParse(registerData);
    
    const zodError = handleZodError(result);
    if (zodError) {
      setError(zodError);
      return;
    }

    setIsLoading(true);
    try {
      await authService.register(registerData);
      const userData = await authService.getMe();
      setUser(userData);
      setIsLoading(false);
      setError(null);
      setMode('login');
    } catch (err) {
      setIsLoading(false);
      setError({ message: 'Помилка реєстрації' });
    }
  };

  const handleLogin = async () => {
    setError(null);
    const result = LoginSchema.safeParse(loginData);
    
    const zodError = handleZodError(result);
    if (zodError) {
      setError(zodError);
      return;
    }

    setIsLoading(true);
    try {
      await authService.login(loginData);
      const userData = await authService.getMe();
      setUser(userData);
      setIsLoading(false);
      setError(null);
    } catch (err) {
      setIsLoading(false);
      setError({ message: 'Помилка входу' });
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await authService.getMe();
        setUser(userData);
      } catch (err) {
        setUser(null);
      }
    };
    fetchUser();
  }, []);

  return {
    mode,
    setMode,
    isLoading,
    error,
    registerData,
    loginData,
    handleRegisterChange,
    handleLoginChange,
    handleRegister,
    handleLogin,
    user,
    setUser,
    clearError: () => setError(null),
  };
};
