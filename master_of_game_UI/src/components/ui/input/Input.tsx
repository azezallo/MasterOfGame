import React from 'react';
import styles from './Input.module.css';
import type { InputProps } from './types';

export const Input: React.FC<InputProps> = ({ label, variant = 'iron', ...props }) => {
  return (
    <div className={styles.inputWrapper}>
      {label && <label className={styles.label}>{label}</label>}
      <input 
        className={`${styles.input} ${variant}`} 
        {...props} 
      />
    </div>
  );
};
