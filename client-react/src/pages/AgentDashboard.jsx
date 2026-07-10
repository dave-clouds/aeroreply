import { useEffect, useState } from 'react'
import { Home, MessageSquare, Users, Settings as SettingsIcon } from 'lucide-react'
import { useSocket } from '../context/SocketContext'
import AeroHub from './AeroHub'
import AgentWorkspace from './AgentWorkspace'
import LiveVisitors from './LiveVisitors'
import Settings from './Settings'

const NAV_ITEMS = [
  { key: 'hub', label: 'AeroHub', icon: Home, view: AeroHub },
  { key: 'workspace', label: 'Agent Workspace', icon: MessageSquare, view: AgentWorkspace },
  { key: 'visitors', label: 'Live Visitors', icon: Users, view: LiveVisitors },
  { key: 'settings', label: 'Settings Panel', icon: SettingsIcon, view: Settings },
]

// The business console shell: a vertical left-hand sidebar (nav clustered
// toward the bottom of the column) plus a content area for the active page.
export default function AgentDashboard() {
  const { socket, connected } = useSocket()
  const [active, setActive] = useState('hub')

  // Being inside the dashboard app marks this session as a human agent —
  // this is what powers the "human agent online" check the ChatWidget uses.
  useEffect(() => {
    if (!socket) return
    socket.emit('agent:join', {})
  }, [socket])

  const ActiveView = NAV_ITEMS.find((i) => i.key === active)?.view ?? AeroHub

  return (
    <div style={styles.shell}>
      <aside style={styles.sidebar}>
        <div style={styles.brandBlock}>
          <span style={styles.brand}>AeroReply</span>
          <span
            style={{
              ...styles.dot,
              background: connected ? '#22c55e' : '#f59e0b',
            }}
            title={connected ? 'Connected' : 'Connecting…'}
          />
        </div>

        <div style={styles.spacer} />

        <nav style={styles.nav}>
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActive(key)}
              style={{
                ...styles.navItem,
                ...(active === key ? styles.navItemActive : {}),
              }}
            >
              <Icon size={18} strokeWidth={2} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <div style={styles.content}>
        <ActiveView />
      </div>
    </div>
  )
}

const styles = {
  shell: {
    display: 'flex',
    width: '100%',
    minHeight: '100vh',
    background: '#0b0f19',
    fontFamily: 'system-ui, sans-serif',
    color: '#f9fafb',
  },
  sidebar: {
    width: '232px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    background: '#111827',
    borderRight: '1px solid #1f2937',
    padding: '20px 14px',
  },
  brandBlock: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 6px',
  },
  brand: {
    fontWeight: 800,
    fontSize: '18px',
    letterSpacing: '-0.5px',
    color: '#60a5fa',
  },
  dot: {
    width: '9px',
    height: '9px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  spacer: {
    flex: 1,
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    background: 'transparent',
    border: 'none',
    borderRadius: '8px',
    color: '#9ca3af',
    fontSize: '13.5px',
    fontWeight: 500,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background 0.15s, color 0.15s',
  },
  navItemActive: {
    background: '#1f2937',
    color: '#f9fafb',
    fontWeight: 600,
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    minHeight: '100vh',
  },
}
