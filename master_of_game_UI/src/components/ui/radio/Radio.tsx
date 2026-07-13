import React from 'react';
import styles from './Radio.module.css';

interface RadioProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Radio: React.FC<RadioProps> = ({ label, ...props }) => {
  return (
    <label className={styles.radioWrapper}>
      <input type="radio" className={styles.radio} {...props} />
      {label && <span className={styles.label}>{label}</span>}
    </label>
  );
};
