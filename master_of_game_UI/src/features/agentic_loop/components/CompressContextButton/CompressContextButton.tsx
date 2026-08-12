import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './CompressContextButton.module.css';

interface CompressContextButtonProps {
  onCompress: () => void;
  isCompressing: boolean;
  disabled?: boolean;
  compressedLogsCount?: number | null;
  className?: string;
}

export const CompressContextButton: React.FC<CompressContextButtonProps> = ({
  onCompress,
  isCompressing,
  disabled = false,
  compressedLogsCount,
  className,
}) => {
  const { t } = useTranslation();

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={`${styles.button} ${className || ''}`}
        onClick={onCompress}
        disabled={disabled || isCompressing}
        title={t(
          'agentic_loop.compress_button.tooltip',
          'Згорнути 80% сухого контексту у Саммарі сесії'
        )}
      >
        <span className={styles.icon}>📜</span>
        <span>
          {isCompressing
            ? t('agentic_loop.compress_button.compressing', 'Стиснення пам\'яті...')
            : t('agentic_loop.compress_button.label', 'Завершити главу')}
        </span>
        {isCompressing && <span className={styles.spinner} />}
      </button>

      {compressedLogsCount !== null && compressedLogsCount !== undefined && (
        <span className={styles.infoBadge}>
          {t('agentic_loop.compress_button.success_badge', 'Стиснено: {{count}}', {
            count: compressedLogsCount,
          })}
        </span>
      )}
    </div>
  );
};
