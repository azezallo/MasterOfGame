import React from 'react';
import styles from './Modal.module.css';

interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  title?: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {title && <h2 className={styles.title}>{title}</h2>}
        <div className={styles.body}>
          {children}
        </div>
        {onClose && (
          <div className={styles.footer}>
            <button className={styles.closeButton} onClick={onClose}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
