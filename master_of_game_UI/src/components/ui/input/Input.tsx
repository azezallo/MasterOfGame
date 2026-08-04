import React, { useId } from 'react';
import styles from './Input.module.css';
import type { InputProps } from './types';

export const Input: React.FC<InputProps> = ({ label, variant = 'iron', id, ...props }) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className={styles.inputWrapper}>
      {label && <label htmlFor={inputId} className={styles.label}>{label}</label>}
      <input 
        id={inputId}
        className={`${styles.input} ${variant}`} 
        {...props} 
      />
    </div>
  );
};
