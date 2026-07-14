import { createContext, useContext, useEffect, useState } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  // Session hydration: on first load, if a token is already stored,
  // validate it against the backend and restore the user/token state.
  useEffect(() => {
    const storedToken = localStorage.getItem('token')

    if (!storedToken) {
      setLoading(false)
      return
    }

    setToken(storedToken)

    api
      .get('/auth/me')
      .then((res) => {
        setUser(res.data)
      })
      .catch(() => {
        // Stored token is invalid/expired — clear it out.
        localStorage.removeItem('token')
        setToken(null)
        setUser(null)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  async function register(name, email, password) {
    const res = await api.post('/auth/register', { name, email, password })
    const { token: newToken, ...userData } = res.data

    localStorage.setItem('token', newToken)
    setToken(newToken)
    setUser(userData)
    setLoading(false)

    return userData
  }

  async function login(email, password) {
    const res = await api.post('/auth/login', { email, password })
    const { token: newToken, ...userData } = res.data

    localStorage.setItem('token', newToken)
    setToken(newToken)
    setUser(userData)
    setLoading(false)

    return userData
  }

  async function logout() {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)

    try {
      // Stateless logout — no session to invalidate server-side, but we
      // still notify the backend for consistency/future auditing.
      await api.post('/auth/logout')
    } catch {
      // Ignore network/server errors — client-side state is already cleared.
    }
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export { AuthContext }
