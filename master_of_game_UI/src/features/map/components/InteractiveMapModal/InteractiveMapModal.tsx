import React, { useMemo } from 'react';
import type { LocationData } from '../../../../types/location';
import styles from './InteractiveMapModal.module.css';

interface InteractiveMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  locations: LocationData[];
  currentLocationId?: string;
  currentMapContext?: LocationData | null;
  mapHistory?: (LocationData | null)[];
  onLocationSelect?: (loc: LocationData) => void;
  onBack?: () => void;
  onBreadcrumbClick?: (index: number) => void;
}

import { useTranslation } from 'react-i18next';

export const InteractiveMapModal: React.FC<InteractiveMapModalProps> = ({
  isOpen,
  onClose,
  locations,
  currentLocationId,
  currentMapContext,
  mapHistory,
  onLocationSelect,
  onBack,
  onBreadcrumbClick
}) => {
  const { t } = useTranslation();

  const { minX, minY, maxX, maxY } = useMemo(() => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    locations.forEach(loc => {
      if (loc.matrix_coordinates) {
        if (loc.matrix_coordinates.x < minX) minX = loc.matrix_coordinates.x;
        if (loc.matrix_coordinates.y < minY) minY = loc.matrix_coordinates.y;
        if (loc.matrix_coordinates.x > maxX) maxX = loc.matrix_coordinates.x;
        if (loc.matrix_coordinates.y > maxY) maxY = loc.matrix_coordinates.y;
      }
    });

    if (minX === Infinity) {
      return { minX: 1, minY: 1, maxX: 1, maxY: 1 };
    }

    return { minX, minY, maxX, maxY };
  }, [locations]);

  if (!isOpen) return null;

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(${maxX - minX + 1}, 100px)`,
    gridTemplateRows: `repeat(${maxY - minY + 1}, 100px)`,
    gap: '4px',
    width: 'fit-content',
    margin: '0 auto',
  };

  const fullPath = [...(mapHistory || []), currentMapContext];

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <header className={styles.header}>
          <h2>{t('map.title')}</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </header>

        <div style={{ 
          padding: '12px 24px', 
          background: 'var(--color-bg-primary)', 
          borderBottom: '1px solid var(--color-border)', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '16px' 
        }}>
          {onBack && (
            <button 
              onClick={onBack}
              style={{
                background: 'none', border: '1px solid var(--color-border)', borderRadius: '4px',
                color: 'var(--color-text)', cursor: 'pointer', fontSize: '0.9rem', padding: '4px 12px',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}
              title="Повернутися на рівень вище"
            >
              ⬅️ Назад
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', flexWrap: 'wrap' }}>
            {fullPath.map((loc, index) => {
              const isLast = index === fullPath.length - 1;
              const name = loc ? `${loc.name} ${loc.matrix_coordinates ? `(${loc.matrix_coordinates.x}, ${loc.matrix_coordinates.y})` : ''}` : 'Світ';
              
              return (
                <React.Fragment key={index}>
                  <span 
                    onClick={() => !isLast && onBreadcrumbClick?.(index)}
                    style={{ 
                      color: isLast ? '#fff' : 'var(--color-text-dim)', 
                      fontWeight: isLast ? 'bold' : 'normal',
                      cursor: isLast ? 'default' : 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      if (!isLast) e.currentTarget.style.color = '#fff';
                    }}
                    onMouseLeave={(e) => {
                      if (!isLast) e.currentTarget.style.color = 'var(--color-text-dim)';
                    }}
                  >
                    {name}
                  </span>
                  {!isLast && <span style={{ color: 'var(--color-border)' }}>/</span>}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <div className={styles.mapContainer}>
          <div style={gridStyle}>
            {locations.length === 0 ? (
              <div style={{ padding: '20px', color: '#888', gridColumn: '1 / -1', textAlign: 'center' }}>
                Тут нічого немає.
              </div>
            ) : (
              locations.map(loc => {
                if (!loc.matrix_coordinates) return null;

              const isCurrent = loc.location_id === currentLocationId;
              const isHidden = loc.discovery_status === 'undiscovered';

              const col = loc.matrix_coordinates.x - minX + 1;
              const row = loc.matrix_coordinates.y - minY + 1;

              return (
                <div
                  key={loc.location_id}
                  className={`${styles.cell} ${isCurrent ? styles.current : ''} ${isHidden ? styles.hidden : ''}`}
                  style={{ gridColumn: col, gridRow: row }}
                  onClick={() => !isHidden && onLocationSelect?.(loc)}
                >
                  {isHidden ? (
                    <span className={styles.unknownText}>?</span>
                  ) : (
                    <>
                      <div className={styles.cellIcon}>
                        {loc.location_type === 'region' ? '🌍' :
                          loc.location_type === 'settlement' ? '🏰' :
                            loc.location_type === 'waterway' ? '🌊' :
                              loc.location_type === 'wilderness' ? '🌲' : '🏠'}
                      </div>
                      <div className={styles.cellName}>{loc.name}</div>
                    </>
                  )}
                </div>
              );
            })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
