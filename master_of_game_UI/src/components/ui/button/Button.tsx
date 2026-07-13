import React from 'react';
import styles from './Button.module.css';
import type { ButtonProps } from './types';

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  isLoading,
  children,
  className,
  disabled,
  ...props
}) => {
  const variantStyles = {
    primary: styles.primary,
    secondary: styles.secondary,
    danger: styles.danger,
  };

  return (
    <button
      className={`${styles.base} ${variantStyles[variant]} ${className || ''}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className={styles.loader}>...</span>
      ) : (
        children
      )}
    </button>
  );
};
