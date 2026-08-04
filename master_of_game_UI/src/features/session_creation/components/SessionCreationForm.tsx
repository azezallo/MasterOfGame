import React from 'react';
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

export const SessionCreationForm: React.FC<SessionCreationFormProps> = ({
  initialData = { gameName: '', characterName: '' },
  onSubmit,
  isLoading,
  error,
}) => {
  const [formData, setFormData] = React.useState<SessionCreationInput>(initialData);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
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
      <h2 className={styles.formTitle}>Створити нову гру</h2>
      
      <div className={styles.inputGroup}>
        <label htmlFor="gameName">Назва гри</label>
        <Input
          id="gameName"
          name="gameName"
          value={formData.gameName}
          onChange={handleChange}
          placeholder="Введіть назву гри"
          required
        />
      </div>

      <div className={styles.inputGroup}>
        <label htmlFor="characterName">Ім'я героя</label>
        <Input
          id="characterName"
          name="characterName"
          value={formData.characterName}
          onChange={handleChange}
          placeholder="Введіть ім'я героя"
          required
        />
      </div>

      {error && <p style={{ color: 'var(--fire-red)' }}>{error}</p>}

      <Button 
        type="submit" 
        className={styles.submitButton} 
        isLoading={isLoading}
      >
        Створити
      </Button>
    </form>
  );
};
