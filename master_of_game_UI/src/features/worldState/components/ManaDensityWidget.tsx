import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './ManaDensityWidget.module.css';

interface ManaDensityWidgetProps {
  density?: number;
}

export type DensityTier = 'zero_zone' | 'low' | 'normal' | 'high' | 'anomaly' | 'instant';

export function getDensityTier(density: number): DensityTier {
  if (density <= 0) return 'zero_zone';
  if (density <= 30) return 'low';
  if (density <= 70) return 'normal';
  if (density <= 95) return 'high';
  if (density < 100) return 'anomaly';
  return 'instant';
}

export function calculateRegenMultiplier(density: number): number | 'infinity' | 0 {
  if (density <= 0) return 0;
  if (density >= 100) return 'infinity';
  return Math.round((density / (100 - density)) * 100) / 100;
}

export const ManaDensityWidget: React.FC<ManaDensityWidgetProps> = ({ density = 50 }) => {
  const { t } = useTranslation();

  const tier = getDensityTier(density);
  const multiplier = calculateRegenMultiplier(density);
  const levelText = t(`magic.density_levels.${tier}`, { defaultValue: tier });

  const getTooltipDescription = () => {
    if (tier === 'zero_zone') {
      return t('magic.regen.tooltip_zero_zone');
    }
    if (tier === 'instant') {
      return t('magic.regen.tooltip_instant');
    }
    return t('magic.regen.tooltip_multiplier', { multiplier });
  };

  return (
    <div className={`${styles.widgetContainer} ${styles[tier]}`}>
      <div className={styles.iconGroup}>
        <span className={styles.sparkIcon}>✨</span>
        <span className={styles.densityValue}>{density}</span>
      </div>

      <span className={styles.levelBadge}>{levelText}</span>

      <div className={styles.tooltip}>
        <div className={styles.tooltipHeader}>{t('magic.regen.tooltip_title')}</div>
        <div className={styles.tooltipValue}>
          {t('magic.density_value', { density })} ({levelText})
        </div>
        <div className={styles.tooltipDesc}>{getTooltipDescription()}</div>
      </div>
    </div>
  );
};
