import AgentDashboard from './pages/AgentDashboard'

// The business console is the main app. The ChatWidget is the embeddable
// customer-facing surface only — it is intentionally not rendered here.
// It ships separately via the embed snippet on the Settings Panel, so the
// dashboard workspace stays strictly focused on the Ticket Queue / message
// console.
export default function App() {
  return (
    <div style={styles.root}>
      <AgentDashboard />
    </div>
  )
}

const styles = {
  root: {
    minHeight: '100vh',
  },
}
