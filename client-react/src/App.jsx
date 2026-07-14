import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import Login from './pages/Login'
import Register from './pages/Register'
import AgentDashboard from './pages/AgentDashboard'
import ProtectedRoute from './components/ProtectedRoute'

// Real React Router routes. "Go to Dashboard" on the landing page navigates
// straight to /dashboard, which renders the AgentDashboard shell — it
// defaults to its AeroHub page, so the sidebar/nav and agent presence wiring
// stay intact rather than rendering AeroHub bare. /dashboard is guarded by
// ProtectedRoute, which redirects unauthenticated visitors to /login.
export default function App() {
  return (
    <div style={styles.root}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingRoute />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <AgentDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </div>
  )
}

function LandingRoute() {
  const navigate = useNavigate()
  return <LandingPage onGoToDashboard={() => navigate('/dashboard')} />
}

const styles = {
  root: {
    minHeight: '100vh',
  },
}
