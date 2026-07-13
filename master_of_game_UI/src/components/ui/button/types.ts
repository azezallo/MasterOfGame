export type ButtonVariant = 'primary' | 'secondary' | 'danger';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  isLoading?: boolean;
  disabled?: boolean;
}
