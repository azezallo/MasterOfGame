import React from 'react';
import styles from './Select.module.css';

interface SelectProps {
  label?: string;
  options: { value: string; label: string }[];
  variant?: 'parchment' | 'iron';
}

export const Select: React.FC<SelectProps> = ({ label, options, variant = 'iron' }) => {
  return (
    <div className={styles.selectWrapper}>
      {label && <label className={styles.label}>{label}</label>}
      <select className={`${styles.select} ${variant}`}>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
};
