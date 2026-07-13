export interface DesignSystemPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export type DesignSystemStatus = 'loading' | 'success' | 'error';
