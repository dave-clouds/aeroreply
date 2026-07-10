import { useState } from 'react'
import { MessageSquare, X } from 'lucide-react'
import ChatWidget from './components/ChatWidget'
import AgentDashboard from './pages/AgentDashboard'

// The business console is the main app. The ChatWidget is the embeddable
// customer-facing surface — here it floats over the console the same way
// it would float over any external site once embedded, rather than living
// behind a top-level navigation tab.
export default function App() {
  const [widgetOpen, setWidgetOpen] = useState(false)

  return (
    <div style={styles.root}>
      <AgentDashboard />

      <div style={styles.floatingArea}>
        {widgetOpen && (
          <div style={styles.floatingWidget}>
            <ChatWidget />
          </div>
        )}
        <button
          type="button"
          style={styles.launcher}
          onClick={() => setWidgetOpen((v) => !v)}
          aria-label={widgetOpen ? 'Close chat widget preview' : 'Open chat widget preview'}
        >
          {widgetOpen ? <X size={22} /> : <MessageSquare size={22} />}
        </button>
      </div>
    </div>
  )
}

const styles = {
  root: {
    minHeight: '100vh',
  },
  floatingArea: {
    position: 'fixed',
    right: '24px',
    bottom: '24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '14px',
    zIndex: 50,
  },
  floatingWidget: {
    boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
    borderRadius: '12px',
  },
  launcher: {
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    border: 'none',
    background: '#3b82f6',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 8px 20px rgba(59,130,246,0.45)',
  },
}
