import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Guards any route tree behind an authenticated session. Shows a neutral
// loading state while the stored token is still being verified (avoids a
// flash of the login screen or the dashboard before we actually know),
// then either redirects to /login or renders the protected children.
export default function ProtectedRoute({ children }) {
  const { user, token, loading } = useAuth()

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.spinner} />
        <span>Loading secure session…</span>
      </div>
    )
  }

  if (!user || !token) {
    return <Navigate to="/login" replace />
  }

  return children
}

const styles = {
  loadingScreen: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    background: '#0b0f19',
    color: '#9ca3af',
    fontFamily: 'system-ui, sans-serif',
    fontSize: '14px',
  },
  spinner: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: '3px solid #1f2937',
    borderTopColor: '#a78bfa',
    animation: 'protected-route-spin 0.8s linear infinite',
  },
}

// Inject the keyframes once (styles above are inline, but keyframes need
// real CSS — this keeps the component fully self-contained).
if (typeof document !== 'undefined' && !document.getElementById('protected-route-spin-keyframes')) {
  const style = document.createElement('style')
  style.id = 'protected-route-spin-keyframes'
  style.textContent = `
    @keyframes protected-route-spin {
      to { transform: rotate(360deg); }
    }
  `
  document.head.appendChild(style)
}
