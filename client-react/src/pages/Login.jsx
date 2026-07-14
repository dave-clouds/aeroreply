import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

// Login screen — mirrors the dark AeroReply visual language used on the
// landing page. Wired to the real `login()` call from AuthContext; no
// mock/static submit handling remains.
export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      const message =
        err?.response?.data?.error?.message || 'Invalid email or password. Please try again.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.brand}>
          <span style={styles.brandMark} />
          <span>AeroReply</span>
        </div>

        <h1 style={styles.title}>Welcome back</h1>
        <p style={styles.subtitle}>Log in to access your agent dashboard.</p>

        {error && <div style={styles.errorAlert}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={styles.input}
              placeholder="you@example.com"
            />
          </label>

          <label style={styles.label}>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={styles.input}
              placeholder="••••••••"
            />
          </label>

          <button type="submit" disabled={submitting} style={styles.submitButton(submitting)}>
            {submitting ? 'Logging in…' : (
              <>
                <LogIn size={16} />
                Log in
              </>
            )}
          </button>
        </form>

        <p style={styles.footerText}>
          Don&apos;t have an account?{' '}
          <Link to="/register" style={styles.footerLink}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#0b0f19',
    color: '#f9fafb',
    fontFamily: 'system-ui, sans-serif',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    background: '#111827',
    border: '1px solid #1f2937',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: 'rgba(0,0,0,0.4) 0 10px 30px -10px',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontWeight: 800,
    fontSize: '18px',
    letterSpacing: '-0.4px',
    marginBottom: '24px',
  },
  brandMark: {
    width: '10px',
    height: '10px',
    borderRadius: '3px',
    background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
  },
  title: {
    fontSize: '24px',
    fontWeight: 800,
    margin: '0 0 4px',
    color: '#f9fafb',
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: '14px',
    margin: '0 0 20px',
  },
  errorAlert: {
    background: 'rgba(248,113,113,0.1)',
    border: '1px solid rgba(248,113,113,0.4)',
    color: '#fca5a5',
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '14px',
    marginBottom: '16px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '13px',
    color: '#d1d5db',
    fontWeight: 600,
  },
  input: {
    background: '#0b0f19',
    border: '1px solid #2e303a',
    borderRadius: '8px',
    padding: '10px 12px',
    color: '#f9fafb',
    fontSize: '14px',
    fontFamily: 'inherit',
    outline: 'none',
  },
  submitButton: (submitting) => ({
    marginTop: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    background: submitting ? '#374151' : 'linear-gradient(135deg, #60a5fa, #a78bfa)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '15px',
    fontWeight: 700,
    cursor: submitting ? 'not-allowed' : 'pointer',
    opacity: submitting ? 0.7 : 1,
  }),
  footerText: {
    marginTop: '20px',
    fontSize: '14px',
    color: '#9ca3af',
    textAlign: 'center',
  },
  footerLink: {
    color: '#a78bfa',
    fontWeight: 600,
    textDecoration: 'none',
  },
}
