import React, { useId } from 'react';
import styles from './Select.module.css';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
  variant?: 'parchment' | 'iron';
}

export const Select: React.FC<SelectProps> = ({ label, options, variant = 'iron', id, ...props }) => {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <div className={styles.selectWrapper}>
      {label && <label htmlFor={selectId} className={styles.label}>{label}</label>}
      <select id={selectId} className={`${styles.select} ${variant}`} {...props}>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
};
