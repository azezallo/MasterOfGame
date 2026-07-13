import React from 'react';
import styles from './Checkbox.module.css';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({ label, ...props }) => {
  return (
    <label className={styles.checkboxWrapper}>
      <input type="checkbox" className={styles.checkbox} {...props} />
      {label && <span className={styles.label}>{label}</span>}
    </label>
  );
};
