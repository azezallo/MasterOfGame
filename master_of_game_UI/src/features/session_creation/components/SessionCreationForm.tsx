import React from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input/Input';
import { Button } from '@/components/ui/button/Button';
import styles from '../styles/SessionCreationForm.module.css';
import type { SessionCreationInput } from '../types';

interface SessionCreationFormProps {
  initialData?: SessionCreationInput;
  onSubmit: (data: SessionCreationInput) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

const MAP_SIZES = [
  { id: 'small', dimensions: { x: 3, y: 3 } },
  { id: 'medium', dimensions: { x: 5, y: 5 } },
  { id: 'large', dimensions: { x: 7, y: 7 } },
];

export const SessionCreationForm: React.FC<SessionCreationFormProps> = ({
  initialData = { gameName: '', characterName: '', mapSize: { x: 5, y: 5 } },
  onSubmit,
  isLoading,
  error,
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = React.useState<SessionCreationInput>(initialData);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'mapSize') {
      setFormData(prev => ({ ...prev, [name]: JSON.parse(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSubmit(formData);
    } catch {
      // Error handling will be managed by the container or hook
    }
  };

  return (
    <form className={styles.formContainer} onSubmit={handleSubmit}>
      <h2 className={styles.formTitle}>{t('session_creation.title')}</h2>
      
      <div className={styles.inputGroup}>
        <label htmlFor="gameName">{t('session_creation.form.game_name')}</label>
        <Input
          id="gameName"
          name="gameName"
          value={formData.gameName}
          onChange={handleChange}
          placeholder={t('session_creation.form.game_name_placeholder')}
          required
        />
      </div>

      <div className={styles.inputGroup}>
        <label htmlFor="characterName">{t('session_creation.form.hero_name')}</label>
        <Input
          id="characterName"
          name="characterName"
          value={formData.characterName}
          onChange={handleChange}
          placeholder={t('session_creation.form.hero_name_placeholder')}
          required
        />
      </div>

      <div className={styles.inputGroup}>
        <label htmlFor="mapSize">{t('session_creation.form.map_size')}</label>
        <select
          id="mapSize"
          name="mapSize"
          value={JSON.stringify(formData.mapSize)}
          onChange={handleChange}
          className={styles.selectInput}
          required
          style={{
            padding: '8px 12px',
            borderRadius: '4px',
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg-secondary)',
            color: 'var(--color-text)',
            fontSize: '1rem'
          }}
        >
          {MAP_SIZES.map(size => (
            <option key={size.id} value={JSON.stringify(size.dimensions)}>
              {t(`session_creation.form.sizes.${size.id}`, size.dimensions)}
            </option>
          ))}
        </select>
      </div>

      {error && <p style={{ color: 'var(--fire-red)' }}>{error}</p>}

      <Button 
        type="submit" 
        className={styles.submitButton} 
        isLoading={isLoading}
      >
        {t('session_creation.submit')}
      </Button>
    </form>
  );
};
