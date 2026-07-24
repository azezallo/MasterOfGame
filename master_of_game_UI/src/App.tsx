import React from 'react'
import './App.css'
import { useDesignSystem } from './features/design-system/hooks/useDesignSystem'
import { DesignSystemPopup } from './features/design-system/components/DesignSystemPopup'
import { AuthPopup } from './features/auth/components/AuthPopup'
import { SessionSelectionContainer } from './features/session_selection/components/SessionSelectionContainer'

function App() {
  const { isOpen, openPopup, closePopup } = useDesignSystem()

  return (
    <>
      <SessionSelectionContainer onSessionSelect={(id) => console.log(`Selected: ${id}`)} />
      
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <button
          type="button"
          className="design-system-trigger"
          onClick={openPopup}
          style={{
            padding: '10px 20px',
            backgroundColor: '#d4af37',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Open Design System
        </button>
      </div>

      <DesignSystemPopup isOpen={isOpen} onClose={closePopup} />
      <AuthPopup />
    </>
  )
}

export default App
