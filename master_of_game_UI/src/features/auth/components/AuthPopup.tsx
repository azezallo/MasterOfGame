import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './AuthPopup.module.css';
import { Button } from '@/components/ui/button/Button';
import { Input } from '@/components/ui/input/Input';
import { Modal } from '@/components/ui/modal/Modal';
import { useAuth } from '../hooks/useAuth';

interface AuthPopupProps {
  auth?: ReturnType<typeof useAuth>;
}

export const AuthPopup: React.FC<AuthPopupProps> = ({ auth: externalAuth }) => {
  const { t } = useTranslation();
  const fallbackAuth = useAuth();
  const auth = externalAuth || fallbackAuth;

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
  } = auth;

  const isVisible = !user;

  const [isReady, setIsReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 500);
    return () => clearTimeout(timer);
  }, []);

  if (!isVisible || !isReady) return null;

  return (
    <Modal isOpen={isVisible} title={mode === 'login' ? t('auth.title_login') : t('auth.title_register')}>
      <div className={styles.formWrapper}>
        {error && <div className={styles.errorMessage}>{error.message}</div>}
        
        {mode === 'register' ? (
          <div className={styles.formFields}>
            <Input
              name="login"
              label={t('auth.fields.username')}
              placeholder={t('auth.fields.username_placeholder')}
              value={registerData.login}
              onChange={handleRegisterChange}
            />
            <Input
              name="password"
              type="password"
              label={t('auth.fields.password')}
              placeholder={t('auth.fields.password_placeholder')}
              value={registerData.password}
              onChange={handleRegisterChange}
            />
            <Input
              name="confirmPassword"
              type="password"
              label={t('auth.fields.confirm_password')}
              placeholder={t('auth.fields.password_placeholder')}
              value={registerData.confirmPassword}
              onChange={handleRegisterChange}
            />
            <Button 
              className={styles.submitButton} 
              onClick={handleRegister} 
              isLoading={isLoading}
            >
              {t('auth.buttons.register')}
            </Button>
          </div>
        ) : (
          <div className={styles.formFields}>
            <Input
              name="login"
              label={t('auth.fields.username')}
              placeholder={t('auth.fields.username_placeholder')}
              value={loginData.login}
              onChange={handleLoginChange}
            />
            <Input
              name="password"
              type="password"
              label={t('auth.fields.password')}
              placeholder={t('auth.fields.password_placeholder')}
              value={loginData.password}
              onChange={handleLoginChange}
            />
            <Button 
              className={styles.submitButton} 
              onClick={handleLogin} 
              isLoading={isLoading}
            >
              {t('auth.buttons.login')}
            </Button>
          </div>
        )}

        <div className={styles.switchMode}>
          {mode === 'login' ? (
            <>
              <p>{t('auth.switch_mode.no_account')} </p>
              <button 
                className={styles.switchButton} 
                onClick={() => {
                  setMode('register');
                  clearError();
                }}
              >
                {t('auth.buttons.register')}
              </button>
            </>
          ) : (
            <>
              <p>{t('auth.switch_mode.has_account')} </p>
              <button 
                className={styles.switchButton} 
                onClick={() => {
                  setMode('login');
                  clearError();
                }}
              >
                {t('auth.buttons.login')}
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};
