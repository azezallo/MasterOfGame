import i18n from '@/i18n/config';

export const formatDate = (timestamp: number): string => {
  if (!timestamp || isNaN(timestamp)) return i18n.t('common.not_specified');
  return new Date(timestamp).toLocaleDateString();
};
