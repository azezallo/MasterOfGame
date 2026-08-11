import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { NpcData, NpcLifecycleStatus } from '../types/npc';
import styles from './NpcDossierModal.module.css';

interface NpcDossierModalProps {
  npc: NpcData | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveNotes?: (notes: string) => Promise<void>;
  isSavingNotes?: boolean;
  saveSuccess?: boolean;
  saveError?: string | null;
}

const STATUS_CLASS_MAP: Record<NpcLifecycleStatus, string> = {
  alive: 'alive',
  dead: 'dead',
  coma: 'coma',
  missing: 'missing',
  captured: 'captured',
  archived: 'archived',
};

export const NpcDossierModal: React.FC<NpcDossierModalProps> = ({
  npc,
  isOpen,
  onClose,
  onSaveNotes,
  isSavingNotes = false,
  saveSuccess = false,
  saveError = null,
}) => {
  const { t } = useTranslation();
  const [notesText, setNotesText] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (npc?.knowledge?.player_notes?.content !== undefined) {
      setNotesText(npc.knowledge.player_notes.content);
    } else {
      setNotesText('');
    }
    setIsDirty(false);
  }, [npc]);

  if (!isOpen || !npc) return null;

  const classKey = STATUS_CLASS_MAP[npc.status] || 'alive';
  const statusLabel = t(`npc.statuses.${npc.status}`, { defaultValue: npc.status });

  const secrets = (npc.knowledge?.hidden_memory?.secrets || []).filter(
    (s) => s.discovery_status !== 'hidden'
  );

  const relationships = npc.relationships || [];

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotesText(e.target.value);
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (onSaveNotes && isDirty) {
      await onSaveNotes(notesText);
      setIsDirty(false);
    }
  };

  return ReactDOM.createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            <div className={styles.avatarCircle}>
              {npc.public_profile.name.charAt(0).toUpperCase()}
            </div>
            <div className={styles.headerInfo}>
              <div className={styles.nameRow}>
                <h2 className={styles.name}>{npc.public_profile.name}</h2>
                <span
                  className={`${styles.statusBadge} ${
                    styles[classKey]
                  }`}
                >
                  {statusLabel}
                </span>
              </div>
              <span className={styles.role}>{npc.public_profile.role}</span>
            </div>
          </div>

          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            title={t('npc.close')}
          >
            ✕
          </button>
        </div>

        <div className={styles.body}>
          {npc.public_profile.appearance && (
            <div className={styles.section}>
              <span className={styles.sectionTitle}>{t('npc.dossier.appearance')}</span>
              <div className={styles.appearanceBox}>
                {npc.public_profile.appearance}
              </div>
            </div>
          )}

          {npc.public_profile.public_description && (
            <div className={styles.section}>
              <span className={styles.sectionTitle}>{t('npc.dossier.public_description')}</span>
              <p className={styles.descriptionText}>
                {npc.public_profile.public_description}
              </p>
            </div>
          )}

          <div className={styles.section}>
            <span className={styles.sectionTitle}>{t('npc.dossier.revealed_secrets')}</span>
            {secrets.length === 0 ? (
              <p className={styles.emptySectionText}>
                {t('npc.dossier.no_secrets')}
              </p>
            ) : (
              <div className={styles.secretsList}>
                {secrets.map((sec) => (
                  <div key={sec.secret_id} className={styles.secretCard}>
                    <span className={styles.secretIcon}>🔒</span>
                    <div className={styles.secretDetails}>
                      <p className={styles.secretDesc}>{sec.description}</p>
                      {sec.discovery_status === 'revealed_to_all' && (
                        <span className={styles.secretTag}>{t('npc.dossier.public_secret_tag')}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles.section}>
            <span className={styles.sectionTitle}>{t('npc.dossier.relationships')}</span>
            {relationships.length === 0 ? (
              <p className={styles.emptySectionText}>
                {t('npc.dossier.no_relationships')}
              </p>
            ) : (
              <div className={styles.relationshipsList}>
                {relationships.map((rel) => (
                  <div key={rel.target_npc_id} className={styles.relCard}>
                    <div className={styles.relHeader}>
                      <span className={styles.relName}>
                        {rel.target_npc_name || rel.target_npc_id}
                      </span>
                      <span className={styles.relType}>
                        {rel.relationship_type}
                      </span>
                    </div>
                    <p className={styles.relSummary}>{rel.summary}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles.section}>
            <span className={styles.sectionTitle}>{t('npc.dossier.player_notes')}</span>
            <div className={styles.notesWrapper}>
              <textarea
                className={styles.notesTextarea}
                placeholder={t('npc.dossier.notes_placeholder')}
                value={notesText}
                onChange={handleNotesChange}
                rows={4}
              />
              <div className={styles.notesActions}>
                {saveSuccess && (
                  <span className={styles.successMsg}>{t('npc.dossier.saved')}</span>
                )}
                {saveError && (
                  <span className={styles.errorMsg}>{saveError || t('npc.dossier.save_error')}</span>
                )}
                <button
                  type="button"
                  className={styles.saveNotesBtn}
                  onClick={handleSave}
                  disabled={!isDirty || isSavingNotes}
                >
                  {isSavingNotes ? t('npc.dossier.saving') : t('npc.dossier.save_notes')}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.closeModalBtn} onClick={onClose}>
            {t('npc.close')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
