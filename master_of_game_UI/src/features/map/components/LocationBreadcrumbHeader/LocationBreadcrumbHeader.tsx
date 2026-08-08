import React from 'react';
import styles from './LocationBreadcrumbHeader.module.css';

interface LocationBreadcrumbHeaderProps {
  breadcrumbs: string[];
  onMapClick?: () => void;
}

export const LocationBreadcrumbHeader: React.FC<LocationBreadcrumbHeaderProps> = ({ breadcrumbs, onMapClick }) => {
  if (!breadcrumbs || breadcrumbs.length === 0) {
    return null;
  }

  return (
    <div className={styles.headerContainer}>
      <nav aria-label="breadcrumb">
        <ol className={styles.breadcrumbList}>
          {breadcrumbs.map((crumb, index) => (
            <li key={index} className={styles.breadcrumbItem}>
              {crumb}
              {index < breadcrumbs.length - 1 && <span className={styles.separator}> / </span>}
            </li>
          ))}
        </ol>
      </nav>
      {onMapClick && (
        <button onClick={onMapClick} className={styles.mapButton} aria-label="Open Interactive Map">
          🗺️ Мапа
        </button>
      )}
    </div>
  );
};
