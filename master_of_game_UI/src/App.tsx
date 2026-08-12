import './App.css'
import { useDesignSystem } from './features/design-system/hooks/useDesignSystem'
import { DesignSystemPopup } from './features/design-system/components/DesignSystemPopup'
import { AuthPopup } from './features/auth/components/AuthPopup'
import { useAuth } from './features/auth/hooks/useAuth'
import { SessionSelectionContainer } from './features/session_selection/components/SessionSelectionContainer'

function App() {
  const { isOpen, closePopup } = useDesignSystem();
  const auth = useAuth();

  return (
    <>
      <SessionSelectionContainer
        user={auth.user}
        onSessionSelect={(id) => console.log(`Selected: ${id}`)}
      />

      <DesignSystemPopup isOpen={isOpen} onClose={closePopup} />
      <AuthPopup auth={auth} />
    </>
  )
}

export default App
