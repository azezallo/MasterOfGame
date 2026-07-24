import React from 'react';

export const GameViewPlaceholder: React.FC = () => {
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '400px', 
      border: '2px dashed #4a4a4a', 
      borderRadius: '8px',
      margin: '20px 0',
      color: '#888'
    }}>
      <p>В процесі</p>
    </div>
  );
};
