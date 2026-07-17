import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import Login from './pages/Login'
import Register from './pages/Register'
import AgentDashboard from './pages/AgentDashboard'
import ProtectedRoute from './components/ProtectedRoute'

// Real React Router routes.
// "Get Started" on the landing page sends unauthenticated visitors to
// /register and authenticated users straight to /dashboard.
// /dashboard is guarded by ProtectedRoute, which redirects unauthenticated
// visitors to /login.
export default function App() {
  return (
    <div style={styles.root}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
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

const styles = {
  root: {
    minHeight: '100vh',
  },
}
