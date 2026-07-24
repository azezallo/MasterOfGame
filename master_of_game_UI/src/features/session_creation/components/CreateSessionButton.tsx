import React, { useState } from 'react';
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
  const { createSession, isLoading, error } = useSessionCreation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCreateSession = async (data: SessionCreationInput) => {
    try {
      const result = await createSession(data);
      if (result.success) {
        // 1. Закриваємо модальне вікно
        setIsModalOpen(false);
        // 2. Оновлюємо стан у батьівському компоненті
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
        Створити нову гру
      </button>
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title="Створення нової сесії"
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
