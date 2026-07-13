import { useState } from 'react'
import LandingPage from './pages/LandingPage'
import AgentDashboard from './pages/AgentDashboard'

// Simple state-based view switching for now. This will be replaced with
// real React Router routes in the next phase — see README for the plan.
// "Go to Dashboard" drops the visitor into the AgentDashboard shell, which
// defaults to its AeroHub page — the sidebar/nav and agent presence wiring
// stay intact rather than rendering AeroHub bare.
export default function App() {
  const [view, setView] = useState('landing') // 'landing' | 'dashboard'

  return (
    <div style={styles.root}>
      {view === 'landing' ? (
        <LandingPage onGoToDashboard={() => setView('dashboard')} />
      ) : (
        <AgentDashboard />
      )}
    </div>
  )
}

const styles = {
  root: {
    minHeight: '100vh',
  },
}
