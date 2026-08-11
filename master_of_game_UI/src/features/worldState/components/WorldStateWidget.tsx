import React from 'react';
import { useTranslation } from 'react-i18next';
import type { WorldState } from '../types/worldState';
import { ManaDensityWidget } from './ManaDensityWidget';
import styles from './WorldStateWidget.module.css';

interface WorldStateWidgetProps {
  worldState: WorldState | null;
  isLoading?: boolean;
  manaDensity?: number;
}

export const WorldStateWidget: React.FC<WorldStateWidgetProps> = ({
  worldState,
  isLoading = false,
  manaDensity = 50,
}) => {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className={styles.inlineHeaderLine}>
        <span className={styles.pulseText}>{t('world_state.loading')}</span>
      </div>
    );
  }

  if (!worldState) {
    return null;
  }

  const { time, weather } = worldState;
  const timeIcon = time.is_night ? '🌙' : '☀️';

  return (
    <div className={styles.inlineHeaderLine} title={t('world_state.title')}>
      <span className={styles.timeIcon}>{timeIcon}</span>
      <span className={styles.narrativeDate}>{time.narrative_date}</span>
      <span className={styles.separator}>|</span>
      <span className={styles.weatherCondition}>{weather.current_condition}</span>
      <span className={styles.separator}>|</span>
      <ManaDensityWidget density={manaDensity} />
    </div>
  );
};
