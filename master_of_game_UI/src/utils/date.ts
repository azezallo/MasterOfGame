export const formatDate = (timestamp: number): string => {
  if (!timestamp || isNaN(timestamp)) return 'Не вказано';
  return new Date(timestamp).toLocaleDateString();
};
