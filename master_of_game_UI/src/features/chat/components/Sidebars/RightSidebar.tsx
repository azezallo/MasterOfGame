import React from 'react';
import { useTranslation } from 'react-i18next';

export const RightSidebar: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div style={{ padding: '15px', color: 'var(--color-text-dim)', textAlign: 'center' }}>
      <p style={{ fontStyle: 'italic', fontSize: '0.9rem' }}>{t('chat.right_sidebar')}</p>
    </div>
  );
};
