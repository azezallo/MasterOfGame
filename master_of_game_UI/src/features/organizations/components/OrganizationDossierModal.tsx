import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { OrganizationDossier } from '../types/organization';
import { getReputationLabel, getReputationStatus } from '../types/organization';
import styles from './OrganizationDossierModal.module.css';

interface OrganizationDossierModalProps {
  organization: OrganizationDossier | null;
  isOpen: boolean;
  isLoading?: boolean;
  onClose: () => void;
  onSaveNotes?: (orgId: string, notes: string) => Promise<void>;
  isSavingNotes?: boolean;
  saveSuccess?: boolean;
  saveError?: string | null;
}

type DossierTab = 'overview' | 'hierarchy' | 'history' | 'notes';

export const OrganizationDossierModal: React.FC<OrganizationDossierModalProps> = ({
  organization,
  isOpen,
  isLoading = false,
  onClose,
  onSaveNotes,
  isSavingNotes = false,
  saveSuccess = false,
  saveError = null,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<DossierTab>('overview');
  const [notesText, setNotesText] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (organization?.player_notes !== undefined) {
      setNotesText(organization.player_notes);
    } else {
      setNotesText('');
    }
    setIsDirty(false);
  }, [organization]);

  if (!isOpen || (!organization && !isLoading)) return null;

  const repStatus = organization ? getReputationStatus(organization.player_reputation) : 'neutral';
  const repLabel = organization ? getReputationLabel(organization.player_reputation, t) : '';
  const typeText = organization
    ? t(`organizations.types.${organization.type}`, { defaultValue: organization.type })
    : '';

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotesText(e.target.value);
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (onSaveNotes && organization && isDirty) {
      await onSaveNotes(organization.id, notesText);
      setIsDirty(false);
    }
  };

  return ReactDOM.createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {isLoading || !organization ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner} />
            <span>{t('organizations.loading')}</span>
          </div>
        ) : (
          <>
            <div className={styles.header}>
              <div className={styles.titleGroup}>
                <div className={styles.avatarCircle}>
                  {organization.name.charAt(0).toUpperCase()}
                </div>
                <div className={styles.headerInfo}>
                  <div className={styles.nameRow}>
                    <h2 className={styles.name}>{organization.name}</h2>
                    <span className={`${styles.repBadge} ${styles[repStatus]}`}>
                      {repLabel} ({organization.player_reputation > 0 ? `+${organization.player_reputation}` : organization.player_reputation})
                    </span>
                    {organization.is_secret && (
                      <span className={styles.secretBadge}>
                        🕵️ {t('organizations.dossier.status_secret')}
                      </span>
                    )}
                  </div>
                  <div className={styles.subRow}>
                    <span className={styles.typeTag}>{typeText}</span>
                    {organization.player_rank ? (
                      <span className={styles.rankBadge}>
                        {t('organizations.dossier.player_rank')} {organization.player_rank}
                      </span>
                    ) : (
                      <span className={styles.noRankBadge}>
                        {t('organizations.dossier.no_rank')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className={styles.closeButton}
                onClick={onClose}
                title={t('organizations.close')}
              >
                ✕
              </button>
            </div>

            <div className={styles.tabNav}>
              <button
                type="button"
                className={`${styles.navTab} ${activeTab === 'overview' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                {t('organizations.dossier.tabs.overview')}
              </button>
              <button
                type="button"
                className={`${styles.navTab} ${activeTab === 'hierarchy' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('hierarchy')}
              >
                {t('organizations.dossier.tabs.hierarchy')} ({organization.hierarchy.length})
              </button>
              <button
                type="button"
                className={`${styles.navTab} ${activeTab === 'history' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('history')}
              >
                {t('organizations.dossier.tabs.history')} ({organization.interactions.length})
              </button>
              <button
                type="button"
                className={`${styles.navTab} ${activeTab === 'notes' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('notes')}
              >
                {t('organizations.dossier.tabs.notes')}
              </button>
            </div>

            <div className={styles.body}>
              {activeTab === 'overview' && (
                <div className={styles.tabContent}>
                  <div className={styles.section}>
                    <span className={styles.sectionTitle}>{t('organizations.dossier.description')}</span>
                    <p className={styles.descriptionText}>{organization.description}</p>
                  </div>

                  <div className={styles.section}>
                    <span className={styles.sectionTitle}>{t('organizations.dossier.public_objectives')}</span>
                    {organization.public_objectives.length === 0 ? (
                      <p className={styles.emptyText}>{t('organizations.dossier.no_objectives')}</p>
                    ) : (
                      <ul className={styles.objectivesList}>
                        {organization.public_objectives.map((obj, idx) => (
                          <li key={idx} className={styles.objectiveItem}>
                            <span className={styles.bullet}>🎯</span>
                            <span>{obj}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'hierarchy' && (
                <div className={styles.tabContent}>
                  <div className={styles.section}>
                    <span className={styles.sectionTitle}>{t('organizations.dossier.hierarchy_title')}</span>
                    {organization.hierarchy.length === 0 ? (
                      <p className={styles.emptyText}>{t('organizations.dossier.no_hierarchy')}</p>
                    ) : (
                      <div className={styles.hierarchyTree}>
                        {organization.hierarchy.map((rank) => {
                          const isPlayerRank = organization.player_rank === rank.rank_id;

                          return (
                            <div
                              key={rank.rank_id}
                              className={`${styles.rankCard} ${isPlayerRank ? styles.playerRankCard : ''}`}
                            >
                              <div className={styles.rankHeader}>
                                <span className={styles.rankName}>{rank.rank_name}</span>
                                <span className={styles.rankIdTag}>ID: {rank.rank_id}</span>
                                {isPlayerRank && (
                                  <span className={styles.activePlayerTag}>⭐ Ваш ранг</span>
                                )}
                              </div>

                              {rank.privileges.length > 0 && (
                                <div className={styles.privilegesBox}>
                                  <span className={styles.boxTitle}>{t('organizations.dossier.privileges')}</span>
                                  <ul className={styles.boxList}>
                                    {rank.privileges.map((priv, idx) => (
                                      <li key={idx}>✓ {priv}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {rank.duties.length > 0 && (
                                <div className={styles.dutiesBox}>
                                  <span className={styles.boxTitle}>{t('organizations.dossier.duties')}</span>
                                  <ul className={styles.boxList}>
                                    {rank.duties.map((duty, idx) => (
                                      <li key={idx}>• {duty}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'history' && (
                <div className={styles.tabContent}>
                  <div className={styles.section}>
                    <span className={styles.sectionTitle}>{t('organizations.dossier.interactions_title')}</span>
                    {organization.interactions.length === 0 ? (
                      <p className={styles.emptyText}>{t('organizations.dossier.no_interactions')}</p>
                    ) : (
                      <div className={styles.timeline}>
                        {organization.interactions.map((item, idx) => {
                          const isPositive = item.reputation_change >= 0;

                          return (
                            <div key={idx} className={styles.timelineItem}>
                              <div className={styles.timelineDot} />
                              <div className={styles.timelineContent}>
                                <div className={styles.timelineHeader}>
                                  <span className={styles.timestamp}>
                                    {new Date(item.timestamp).toLocaleString('uk-UA')}
                                  </span>
                                  <span
                                    className={`${styles.deltaBadge} ${
                                      isPositive ? styles.positiveDelta : styles.negativeDelta
                                    }`}
                                  >
                                    {isPositive ? `+${item.reputation_change}` : item.reputation_change}
                                  </span>
                                </div>
                                <p className={styles.timelineDesc}>{item.description}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'notes' && (
                <div className={styles.tabContent}>
                  <div className={styles.section}>
                    <span className={styles.sectionTitle}>{t('organizations.dossier.player_notes')}</span>
                    <textarea
                      className={styles.notesTextarea}
                      placeholder={t('organizations.dossier.notes_placeholder')}
                      value={notesText}
                      onChange={handleNotesChange}
                    />

                    <div className={styles.notesActionRow}>
                      <button
                        type="button"
                        className={styles.saveNotesBtn}
                        onClick={handleSave}
                        disabled={!isDirty || isSavingNotes}
                      >
                        {isSavingNotes ? t('organizations.dossier.saving') : t('organizations.dossier.save_notes')}
                      </button>

                      {saveSuccess && (
                        <span className={styles.saveSuccessTag}>
                          {t('organizations.dossier.saved')}
                        </span>
                      )}

                      {saveError && <span className={styles.saveErrorTag}>{saveError}</span>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};
