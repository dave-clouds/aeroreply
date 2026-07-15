import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Home, MessageSquare, Users, Menu, X,
  MoreHorizontal, Code2, UserCircle, LogOut, ChevronDown,
} from 'lucide-react'
import { useSocket } from '../context/SocketContext'
import { useAuth } from '../context/AuthContext'
import AeroHub from './AeroHub'
import AgentWorkspace from './AgentWorkspace'
import LiveVisitors from './LiveVisitors'
import Settings from './Settings'
import AccountSettings from './AccountSettings'

// Primary nav — the four main dashboard areas.
const NAV_ITEMS = [
  { key: 'hub',       label: 'AeroHub',        icon: Home,          view: AeroHub },
  { key: 'workspace', label: 'Agent Workspace', icon: MessageSquare, view: AgentWorkspace },
  { key: 'visitors',  label: 'Live Visitors',   icon: Users,         view: LiveVisitors },
]

// Views reachable from the "More" submenu (not shown in primary nav).
const MORE_VIEWS = {
  integrationCode: Settings,
  accountSettings: AccountSettings,
}

// The business console shell: a toggleable left-hand sidebar with the main
// nav at the top and a "More" accordion at the bottom that houses
// Integration Code, Account Settings, and Log Out.
// On mobile it's hidden by default and slides in from a fixed hamburger
// toggle; on desktop it's always visible.
export default function AgentDashboard() {
  const { socket, connected } = useSocket()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [active, setActive] = useState('hub')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

  // Being inside the dashboard app marks this session as a human agent —
  // this is what powers the "human agent online" check the ChatWidget uses.
  useEffect(() => {
    if (!socket) return
    socket.emit('agent:join', {})
  }, [socket])

  const ActiveView =
    NAV_ITEMS.find((i) => i.key === active)?.view ??
    MORE_VIEWS[active] ??
    AeroHub

  function selectNav(key) {
    setActive(key)
    setMoreOpen(false)
    setIsSidebarOpen(false)
  }

  function selectMore(key) {
    setActive(key)
    setMoreOpen(false)
    setIsSidebarOpen(false)
  }

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div style={styles.shell}>
      <style>{RESPONSIVE_CSS}</style>

      <button
        type="button"
        className="ard-hamburger"
        style={styles.hamburger}
        onClick={() => setIsSidebarOpen((v) => !v)}
        aria-label={isSidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
      >
        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {isSidebarOpen && (
        <div
          className="ard-overlay"
          style={styles.overlay}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={`ard-sidebar ${isSidebarOpen ? 'ard-sidebar-open' : ''}`}
        style={styles.sidebar}
      >
        {/* Brand + connection dot */}
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

        {/* Primary nav */}
        <nav style={styles.nav}>
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => selectNav(key)}
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

        <div style={styles.spacer} />

        {/* ---- More accordion ---- */}
        <div style={styles.moreWrap}>
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            style={{
              ...styles.navItem,
              ...styles.moreToggle,
              ...(moreOpen ? styles.moreToggleOpen : {}),
            }}
            aria-expanded={moreOpen}
          >
            <MoreHorizontal size={18} strokeWidth={2} />
            <span>More</span>
            <ChevronDown
              size={14}
              style={{
                marginLeft: 'auto',
                transition: 'transform 0.2s ease',
                transform: moreOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
          </button>

          {moreOpen && (
            <div style={styles.submenu}>
              <button
                type="button"
                onClick={() => selectMore('integrationCode')}
                style={{
                  ...styles.submenuItem,
                  ...(active === 'integrationCode' ? styles.submenuItemActive : {}),
                }}
              >
                <Code2 size={15} strokeWidth={2} />
                <span>Integration Code</span>
              </button>

              <button
                type="button"
                onClick={() => selectMore('accountSettings')}
                style={{
                  ...styles.submenuItem,
                  ...(active === 'accountSettings' ? styles.submenuItemActive : {}),
                }}
              >
                <UserCircle size={15} strokeWidth={2} />
                <span>Account Settings</span>
              </button>

              <div style={styles.submenuDivider} />

              <button
                type="button"
                onClick={handleLogout}
                style={{ ...styles.submenuItem, ...styles.submenuLogout }}
              >
                <LogOut size={15} strokeWidth={2} />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      <div className="ard-content" style={styles.content}>
        <ActiveView />
      </div>
    </div>
  )
}

const RESPONSIVE_CSS = `
  .ard-hamburger { display: none; }

  @media (max-width: 860px) {
    .ard-hamburger { display: flex !important; }
    .ard-sidebar {
      position: fixed !important;
      top: 0;
      left: 0;
      height: 100vh;
      transform: translateX(-100%);
      transition: transform 0.25s ease;
      z-index: 60;
      box-shadow: 0 0 0 rgba(0,0,0,0);
    }
    .ard-sidebar-open {
      transform: translateX(0);
      box-shadow: 4px 0 24px rgba(0,0,0,0.5);
    }
    .ard-content {
      width: 100%;
      padding-top: 56px;
    }
  }
`

const styles = {
  shell: {
    display: 'flex',
    width: '100%',
    minHeight: '100vh',
    background: '#0b0f19',
    fontFamily: 'system-ui, sans-serif',
    color: '#f9fafb',
  },
  hamburger: {
    position: 'fixed',
    top: '14px',
    left: '14px',
    zIndex: 70,
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    border: '1px solid #1f2937',
    background: '#111827',
    color: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 6px 18px rgba(0,0,0,0.35)',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 55,
  },
  sidebar: {
    width: '232px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    background: '#111827',
    borderRight: '1px solid #1f2937',
    padding: '20px 14px',
    overflowY: 'auto',
  },
  brandBlock: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 6px',
    marginBottom: '18px',
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
    fontFamily: 'inherit',
    width: '100%',
  },
  navItemActive: {
    background: '#1f2937',
    color: '#f9fafb',
    fontWeight: 600,
  },

  // More accordion
  moreWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  moreToggle: {
    color: '#9ca3af',
    border: '1px solid #1f2937',
    marginBottom: '0',
  },
  moreToggleOpen: {
    background: '#1f2937',
    color: '#f9fafb',
    borderColor: '#374151',
    borderBottomLeftRadius: '0',
    borderBottomRightRadius: '0',
  },
  submenu: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    background: '#0f1623',
    border: '1px solid #1f2937',
    borderTop: 'none',
    borderRadius: '0 0 8px 8px',
    padding: '6px 6px 8px',
  },
  submenuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '9px',
    padding: '9px 10px',
    background: 'transparent',
    border: 'none',
    borderRadius: '6px',
    color: '#9ca3af',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: 'inherit',
    width: '100%',
    transition: 'background 0.12s, color 0.12s',
  },
  submenuItemActive: {
    background: '#1f2937',
    color: '#f9fafb',
    fontWeight: 600,
  },
  submenuDivider: {
    height: '1px',
    background: '#1f2937',
    margin: '4px 4px',
  },
  submenuLogout: {
    color: '#f87171',
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    minHeight: '100vh',
  },
}
