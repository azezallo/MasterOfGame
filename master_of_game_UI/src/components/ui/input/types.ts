import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  type?: 'text' | 'password' | 'number';
  variant?: 'parchment' | 'iron';
}
