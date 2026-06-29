import { useState } from 'react'
import ChatWidget from './components/ChatWidget'
import AgentDashboard from './components/AgentDashboard'

export default function App() {
  const [view, setView] = useState('customer')

  return (
    <div style={styles.root}>
      <nav style={styles.nav}>
        <span style={styles.brand}>AeroReply</span>
        <div style={styles.tabs}>
          <button
            style={{
              ...styles.tab,
              ...(view === 'customer' ? styles.tabActive : {}),
            }}
            onClick={() => setView('customer')}
          >
            Customer Chat
          </button>
          <button
            style={{
              ...styles.tab,
              ...(view === 'agent' ? styles.tabActive : {}),
            }}
            onClick={() => setView('agent')}
          >
            Agent Dashboard
          </button>
        </div>
      </nav>

      <div style={styles.content}>
        {view === 'customer' ? <ChatWidget /> : <AgentDashboard />}
      </div>
    </div>
  )
}

const styles = {
  root: {
    minHeight: '100vh',
    background: '#030712',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'system-ui, sans-serif',
    color: '#f9fafb',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 24px',
    borderBottom: '1px solid #1f2937',
    background: '#111827',
  },
  brand: {
    fontWeight: 800,
    fontSize: '18px',
    letterSpacing: '-0.5px',
    color: '#60a5fa',
  },
  tabs: {
    display: 'flex',
    gap: '4px',
    background: '#1f2937',
    borderRadius: '8px',
    padding: '3px',
  },
  tab: {
    background: 'transparent',
    border: 'none',
    color: '#9ca3af',
    padding: '6px 14px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    transition: 'all 0.15s',
  },
  tabActive: {
    background: '#374151',
    color: '#f9fafb',
    fontWeight: 600,
  },
  content: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 16px',
  },
}
