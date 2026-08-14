import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './TurnProgressIndicator.module.css';
import type { TurnStage, SubagentGroup } from '../../types';

interface TurnProgressIndicatorProps {
  stage: TurnStage;
  subagent?: SubagentGroup | null;
  statusMessage?: string | null;
  onCancel?: () => void;
}

export const TurnProgressIndicator: React.FC<TurnProgressIndicatorProps> = ({
  stage,
  subagent,
  statusMessage,
  onCancel,
}) => {
  const { t } = useTranslation();

  if (stage === 'idle' || stage === 'completed') {
    return null;
  }

  const getSubagentBadgeText = (group: SubagentGroup) => {
    switch (group) {
      case 'property':
        return t('agentic_loop.subagents.property', 'Майно & Інвентар');
      case 'world':
        return t('agentic_loop.subagents.world', 'Стан Світу & Погода');
      case 'actor':
        return t('agentic_loop.subagents.actor', 'Сутності & Показники');
    }
  };

  const renderContent = () => {
    switch (stage) {
      case 'pre_fetch':
        return (
          <div className={styles.stageItem}>
            <span className={styles.icon}>🔍</span>
            <span className={styles.stageTitle}>
              {t('agentic_loop.stages.pre_fetch', 'Збирання пам\'яті (RAG & Short Memory)')}
            </span>
          </div>
        );
      case 'master_eval':
        return (
          <div className={styles.stageItem}>
            <span className={styles.icon}>🧠</span>
            <span className={styles.stageTitle}>
              {t('agentic_loop.stages.master_eval', 'Аналіз ситуації ШІ-Майстром')}
            </span>
          </div>
        );
      case 'subagent':
        return (
          <div className={styles.stageItem}>
            <span className={styles.icon}>⚙️</span>
            <span className={styles.stageTitle}>
              {t('agentic_loop.stages.subagent', 'Делегування Технічному Сабагенту')}
            </span>
            {subagent && (
              <span className={`${styles.badge} ${styles[subagent]}`}>
                {getSubagentBadgeText(subagent)}
              </span>
            )}
          </div>
        );
      case 'master_gen':
      case 'narrative':
        return (
          <div className={styles.stageItem}>
            <span className={styles.icon}>📖</span>
            <span className={styles.stageTitle}>
              {t('agentic_loop.stages.narrative', 'Генерація художньої оповіді')}
            </span>
          </div>
        );
      case 'error':
        return (
          <div className={`${styles.stageItem} ${styles.errorItem}`}>
            <span className={styles.icon}>❌</span>
            <span className={styles.stageTitle}>
              {t('agentic_loop.stages.error', 'Помилка виконання')}
            </span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`${styles.container} ${stage === 'error' ? styles.containerError : ''}`}>
      <div className={styles.header}>
        <div className={styles.spinner} />
        {renderContent()}
      </div>

      {statusMessage && <div className={styles.message}>{statusMessage}</div>}

      {onCancel && stage !== 'error' && (
        <button type="button" className={styles.cancelBtn} onClick={onCancel}>
          {t('common.cancel', 'Скасувати')}
        </button>
      )}
    </div>
  );
};
