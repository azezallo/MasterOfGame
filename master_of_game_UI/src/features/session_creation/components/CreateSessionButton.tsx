import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/modal/Modal.tsx';
import { SessionCreationForm } from './SessionCreationForm';
import { useSessionCreation } from '../hooks/useSessionCreation';
import type { SessionCreationInput } from '../types';

interface CreateSessionButtonProps {
  className?: string;
  onSessionSelected?: (id: string) => void;
}

export const CreateSessionButton: React.FC<CreateSessionButtonProps> = ({
  className,
  onSessionSelected,
}) => {
  const { t } = useTranslation();
  const { createSession, isLoading, error } = useSessionCreation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCreateSession = async (data: SessionCreationInput) => {
    try {
      const result = await createSession(data);
      if (result.success) {
        setIsModalOpen(false);
        if (onSessionSelected) {
          onSessionSelected(result.data.session_id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <button 
        className={`${className || ''}`} 
        onClick={() => setIsModalOpen(true)}
        disabled={isLoading}
      >
        {t('session_creation.button')}
      </button>
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={t('session_creation.button_title')}
      >
        <SessionCreationForm 
          isLoading={isLoading}
          error={error}
          onSubmit={handleCreateSession}
        />
      </Modal>
    </>
  );
};
