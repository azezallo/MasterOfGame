import React, { useState, useEffect } from 'react';
import styles from './AuthPopup.module.css';
import { Button } from '@/components/ui/button/Button';
import { Input } from '@/components/ui/input/Input';
import { Modal } from '@/components/ui/modal/Modal';
import { useAuth } from '../hooks/useAuth';

export const AuthPopup: React.FC = () => {
  const {
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
    clearError,
  } = useAuth();

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [user]);

  const [isReady, setIsReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 500);
    return () => clearTimeout(timer);
  }, []);

  if (!isVisible || !isReady) return null;

  return (
    <Modal isOpen={isVisible} title={mode === 'login' ? 'Вхід у гру' : 'Реєстрація'}>
      <div className={styles.formWrapper}>
        {error && <div className={styles.errorMessage}>{error.message}</div>}
        
        {mode === 'register' ? (
          <div className={styles.formFields}>
            <Input
              name="login"
              label="Ім'я користувача"
              placeholder="Введіть ім'я"
              value={registerData.login}
              onChange={handleRegisterChange}
            />
            <Input
              name="password"
              type="password"
              label="Пароль"
              placeholder="********"
              value={registerData.password}
              onChange={handleRegisterChange}
            />
            <Input
              name="confirmPassword"
              type="password"
              label="Підтвердження пароля"
              placeholder="********"
              value={registerData.confirmPassword}
              onChange={handleRegisterChange}
            />
            <Button 
              className={styles.submitButton} 
              onClick={handleRegister} 
              isLoading={isLoading}
            >
              Реєстрація
            </Button>
          </div>
        ) : (
          <div className={styles.formFields}>
            <Input
              name="login"
              label="Ім'я користувача"
              placeholder="Введіть ім'я"
              value={loginData.login}
              onChange={handleLoginChange}
            />
            <Input
              name="password"
              type="password"
              label="Пароль"
              placeholder="********"
              value={loginData.password}
              onChange={handleLoginChange}
            />
            <Button 
              className={styles.submitButton} 
              onClick={handleLogin} 
              isLoading={isLoading}
            >
              Увійти
            </Button>
          </div>
        )}

        <div className={styles.switchMode}>
          {mode === 'login' ? (
            <>
              <p>Немаєте акаунту? </p>
              <button 
                className={styles.switchButton} 
                onClick={() => {
                  setMode('register');
                  clearError();
                }}
              >
                Реєстрація
              </button>
            </>
          ) : (
            <>
              <p>Вже маєте акаунт? </p>
              <button 
                className={styles.switchButton} 
                onClick={() => {
                  setMode('login');
                  clearError();
                }}
              >
                Увійти
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};
