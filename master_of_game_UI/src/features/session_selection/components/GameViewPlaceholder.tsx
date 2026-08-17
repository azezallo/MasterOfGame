import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './GameViewPlaceholder.module.css';

export const GameViewPlaceholder: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className={styles.container}>
      <p>{t('session.placeholder_in_progress', 'В процесі')}</p>
    </div>
  );
};
