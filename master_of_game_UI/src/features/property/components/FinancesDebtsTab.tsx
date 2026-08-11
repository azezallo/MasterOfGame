import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PropertyProfile } from '../types/property';
import styles from './FinancesDebtsTab.module.css';

interface FinancesDebtsTabProps {
  property: PropertyProfile;
}

export const FinancesDebtsTab: React.FC<FinancesDebtsTabProps> = ({ property }) => {
  const { t } = useTranslation();
  const { finances } = property;

  const [openSections, setOpenSections] = useState({
    bankAccounts: true,
    notes: true,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className={styles.container}>
      {/* Universal Coins Card */}
      <div className={styles.coinsCard}>
        <div className={styles.coinsHeader}>
          <span className={styles.coinsIcon}>🪙</span>
          <div>
            <div className={styles.coinsTitle}>{t('property.finances.cash_title')}</div>
            <div className={styles.coinsSubtitle}>{t('property.finances.cash_subtitle')}</div>
          </div>
        </div>
        <div className={styles.coinsAmount}>
          {t('property.finances.coins_unit', { amount: finances.coins.toLocaleString() })}
        </div>
      </div>

      {/* Bank Accounts Accordion */}
      <div className={styles.accordionHeader} onClick={() => toggleSection('bankAccounts')}>
        <span className={`${styles.chevron} ${openSections.bankAccounts ? styles.open : ''}`}>
          ▼
        </span>
        <span>{t('property.finances.bank_title')}</span>
      </div>

      {openSections.bankAccounts && (
        <div className={styles.sectionBody}>
          {finances.bank_accounts.length === 0 ? (
            <div className={styles.emptyCard}>{t('property.finances.no_bank_accounts')}</div>
          ) : (
            <div className={styles.listGroup}>
              {finances.bank_accounts.map(acc => (
                <div key={acc.account_id} className={styles.bankCard}>
                  <div className={styles.bankHeader}>
                    <span className={styles.bankName}>
                      {t('property.finances.account_number', { number: acc.account_number })}
                    </span>
                    <span className={styles.bankBalance}>
                      🪙 {acc.balance_coins.toLocaleString()}
                    </span>
                  </div>
                  <div className={styles.bankSubText}>
                    <span>{t('property.finances.location', { location: acc.bank_location_id })}</span>
                    <span>{t('property.finances.guild', { guild: acc.guild_id })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Promissory Notes Accordion */}
      <div className={styles.accordionHeader} onClick={() => toggleSection('notes')}>
        <span className={`${styles.chevron} ${openSections.notes ? styles.open : ''}`}>▼</span>
        <span>{t('property.finances.notes_title')}</span>
      </div>

      {openSections.notes && (
        <div className={styles.sectionBody}>
          {finances.promissory_notes.length === 0 ? (
            <div className={styles.emptyCard}>{t('property.finances.no_notes')}</div>
          ) : (
            <div className={styles.listGroup}>
              {finances.promissory_notes.map(note => (
                <div key={note.note_id} className={styles.noteCard}>
                  <div className={styles.noteHeader}>
                    <span className={styles.debtorName}>👤 {note.debtor_name}</span>
                    <span className={styles.noteAmount}>
                      🪙 {note.amount_coins.toLocaleString()}
                    </span>
                  </div>
                  <div className={styles.noteDesc}>{note.description}</div>
                  <div className={styles.noteDueDate}>
                    ⏳ {t('property.finances.due_date', { date: note.due_date })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
