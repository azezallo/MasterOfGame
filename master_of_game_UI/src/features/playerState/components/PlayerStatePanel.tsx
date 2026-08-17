import React from 'react';
import { useTranslation } from 'react-i18next';
import { usePlayerState } from '../hooks/usePlayerState';
import { useWorldState } from '@/features/worldState';
import {
  getManaNarrative,
  getSkillNarrative,
  type StateItem,
  type PlayerAttributes,
} from '../types/playerState';
import styles from './PlayerStatePanel.module.css';

interface PlayerStatePanelProps {
  sessionId: string;
}

export const PlayerStatePanel: React.FC<PlayerStatePanelProps> = ({ sessionId }) => {
  const { t } = useTranslation();
  const { playerState, loading, error } = usePlayerState(sessionId);
  const { worldState } = useWorldState({ sessionId });

  const formatRelativeTime = (isoString: string): string => {
    if (!isoString) return '';
    const effectDate = new Date(isoString);
    const currentGameDate = worldState?.time?.current_date ? new Date(worldState.time.current_date) : null;
    const referenceTime = currentGameDate && !isNaN(currentGameDate.getTime()) ? currentGameDate.getTime() : Date.now();

    const diffMs = referenceTime - effectDate.getTime();
    if (diffMs < 0) return t('player_state.time.just_now', 'щойно');

    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes < 1) return t('player_state.time.just_now', 'щойно');
    if (diffMinutes < 60) return t('player_state.time.minutes_ago', { count: diffMinutes, defaultValue: `${diffMinutes} хв тому` });
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return t('player_state.time.hours_ago', { count: diffHours, defaultValue: `${diffHours} год тому` });
    const diffDays = Math.floor(diffHours / 24);
    return t('player_state.time.days_ago', { count: diffDays, defaultValue: `${diffDays} дн тому` });
  };

  if (loading && !playerState) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.title}>👤 {t('player_state.title', 'Стан персонажа')}</h3>
        </div>
        <div className={styles.emptyState}>{t('player_state.loading', 'Завантаження стану...')}</div>
      </div>
    );
  }

  if (error && !playerState) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.title}>👤 {t('player_state.title', 'Стан персонажа')}</h3>
        </div>
        <div className={styles.emptyState}>{error}</div>
      </div>
    );
  }

  if (!playerState) return null;

  const manaNarrative = getManaNarrative(
    playerState.magic_stats.current_mana,
    playerState.magic_stats.mana_pool,
    t
  );

  const renderStateBadges = (states: StateItem[], type: 'physical' | 'body' | 'psychological') => {
    if (!states || states.length === 0) {
      return <span className={styles.emptyState}>{t('player_state.states.no_effects', 'Норма (немає ефектів)')}</span>;
    }
    const badgeClass =
      type === 'physical'
        ? styles.physicalBadge
        : type === 'body'
        ? styles.bodyBadge
        : styles.psychologicalBadge;

    return states.map((item, idx) => (
      <span key={`${item.name}-${idx}`} className={`${styles.stateBadge} ${badgeClass}`}>
        <span>{t(`player_state.states.${item.name}`, item.name)}</span>
        <span className={styles.timeTag}>({formatRelativeTime(item.timestamp)})</span>
      </span>
    ));
  };

  const getManaBarClass = (tier: string) => {
    switch (tier) {
      case 'full': return styles.manaBarFull;
      case 'normal': return styles.manaBarNormal;
      case 'fatigued': return styles.manaBarFatigued;
      case 'critical': return styles.manaBarCritical;
      default: return styles.manaBarNormal;
    }
  };

  const getManaDescClass = (tier: string) => {
    switch (tier) {
      case 'full': return styles.descFull;
      case 'normal': return styles.descNormal;
      case 'fatigued': return styles.descFatigued;
      case 'critical': return styles.descCritical;
      default: return styles.descNormal;
    }
  };

  const getSkillTierClass = (tier: string) => {
    switch (tier) {
      case 'grandmaster': return styles.tierGrandmaster;
      case 'master': return styles.tierMaster;
      case 'practiced': return styles.tierPracticed;
      case 'apprentice': return styles.tierApprentice;
      case 'novice': return styles.tierNovice;
      default: return styles.tierNovice;
    }
  };

  const baseRegen = playerState.magic_stats.base_regen ?? 10.0;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          <span className={styles.titleIcon}>✨</span> {t('player_state.title', 'Стан Персонажа')}
        </h3>
      </div>

      {/* Mana Card */}
      <div className={styles.manaCard}>
        <div className={styles.manaHeader}>
          <span className={styles.manaTitle}>🔮 {t('player_state.mana.title', 'Запас Мани')}</span>
          <span className={styles.manaValues}>
            {playerState.magic_stats.current_mana} / {playerState.magic_stats.mana_pool}
          </span>
        </div>
        <div className={styles.manaBarOuter}>
          <div
            className={`${styles.manaBarInner} ${getManaBarClass(manaNarrative.tier)}`}
            style={{ width: `${manaNarrative.percentage}%` }}
          />
        </div>
        <div className={`${styles.manaDesc} ${getManaDescClass(manaNarrative.tier)}`}>
          <strong>{manaNarrative.title}:</strong> {manaNarrative.description}
        </div>
        <div className={styles.manaFlow} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
          <span>{t('magic.regen.flow_val', { amount: playerState.magic_stats.mana_flow, defaultValue: `Потік: +${playerState.magic_stats.mana_flow} / хв` })}</span>
          <span>{t('magic.regen.base_regen_val', { amount: baseRegen, defaultValue: `Баз. регенерація: +${baseRegen} / год` })}</span>
        </div>
      </div>

      {/* Qualitative States */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>{t('player_state.sections.physical', 'Фізичний стан')}</h4>
        <div className={styles.statesGrid}>
          {renderStateBadges(playerState.physical_states, 'physical')}
        </div>
      </div>

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>{t('player_state.sections.body', 'Тілесні стани')}</h4>
        <div className={styles.statesGrid}>
          {renderStateBadges(playerState.body_states, 'body')}
        </div>
      </div>

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>{t('player_state.sections.psychological', 'Психологічний стан')}</h4>
        <div className={styles.statesGrid}>
          {renderStateBadges(playerState.psychological_states, 'psychological')}
        </div>
      </div>

      {/* Attributes List */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>{t('player_state.sections.attributes', 'Атрибути')}</h4>
        <div className={styles.attrList}>
          {(Object.keys(playerState.attributes) as Array<keyof PlayerAttributes>).map(key => (
            <div key={key} className={styles.attrRow}>
              <span className={styles.attrName}>{t(`player_state.attributes.${key}`, key)}</span>
              <span className={styles.attrValue}>{playerState.attributes[key]}</span>
            </div>
          ))}
          <div className={`${styles.attrRow} ${styles.derivedRow}`}>
            <span className={styles.derivedName}>{t('player_state.attributes.max_carry_weight', 'Гранична вага')}</span>
            <span className={styles.derivedValue}>
              {t('player_state.attributes.weight_unit', { weight: playerState.derived_stats.max_carry_weight_kg, defaultValue: `${playerState.derived_stats.max_carry_weight_kg} кг` })}
            </span>
          </div>
        </div>
      </div>

      {/* Skills (Narrative) */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>{t('player_state.sections.skills', 'Навички')}</h4>
        <div className={styles.skillsList}>
          {(() => {
            const skillsList = Array.isArray(playerState.skills)
              ? playerState.skills
              : typeof playerState.skills === 'object' && playerState.skills !== null
              ? Object.entries(playerState.skills).map(([k, v]) => ({ name: k, value: v as number }))
              : [];

            return skillsList.map((skill, index) => {
              const narrative = getSkillNarrative(skill.value, t);
              return (
                <div key={skill.name || index} className={styles.skillRow}>
                  <span className={styles.skillName}>{skill.name}</span>
                  <span className={`${styles.skillTierBadge} ${getSkillTierClass(narrative.tier)}`}>
                    {narrative.title}
                  </span>
                </div>
              );
            });
          })()}
        </div>
      </div>
    </div>
  );
};
