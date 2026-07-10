import { useEffect, useState } from 'react'
import { useSocket } from '../context/SocketContext'

// AeroHub — the analytics overview / index page of the business console.
export default function AeroHub() {
  const { connected } = useSocket()
  const [tickets, setTickets] = useState([])
  const [fetchState, setFetchState] = useState('loading')

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/tickets', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Server returned ${res.status}`)
        return res.json()
      })
      .then(({ tickets: fetched }) => {
        setTickets(fetched)
        setFetchState('done')
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setFetchState('error')
      })
    return () => controller.abort()
  }, [])

  const open = tickets.filter((t) => t.status === 'open').length
  const handoff = tickets.filter((t) => t.status === 'handoff').length
  const total = tickets.length

  const stats = [
    { label: 'Active Tickets', value: total },
    { label: 'Awaiting Human', value: handoff },
    { label: 'AI-Handled', value: open },
  ]

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>AeroHub</h1>
        <p style={styles.subtitle}>Your support activity at a glance.</p>
      </header>

      <div style={styles.statGrid}>
        {stats.map((s) => (
          <div key={s.label} style={styles.statCard}>
            <div style={styles.statValue}>
              {fetchState === 'loading' ? '—' : s.value}
            </div>
            <div style={styles.statLabel}>{s.label}</div>
          </div>
        ))}
        <div style={styles.statCard}>
          <div
            style={{
              ...styles.statValue,
              color: connected ? '#22c55e' : '#f59e0b',
              fontSize: '20px',
            }}
          >
            {connected ? 'Online' : 'Connecting…'}
          </div>
          <div style={styles.statLabel}>Gateway Status</div>
        </div>
      </div>

      <div style={styles.note}>
        Head to <strong>Agent Workspace</strong> to respond to incoming tickets, or{' '}
        <strong>Live Visitors</strong> to watch real-time traffic.
      </div>
    </div>
  )
}

const styles = {
  page: {
    padding: '28px 32px',
    color: '#f9fafb',
    fontFamily: 'system-ui, sans-serif',
    overflowY: 'auto',
    flex: 1,
  },
  header: {
    marginBottom: '24px',
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 800,
  },
  subtitle: {
    margin: '4px 0 0',
    color: '#9ca3af',
    fontSize: '14px',
  },
  statGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '16px',
    maxWidth: '720px',
  },
  statCard: {
    background: '#1f2937',
    border: '1px solid #374151',
    borderRadius: '10px',
    padding: '18px',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: 800,
  },
  statLabel: {
    marginTop: '4px',
    color: '#9ca3af',
    fontSize: '12px',
  },
  note: {
    marginTop: '28px',
    color: '#9ca3af',
    fontSize: '13px',
    maxWidth: '480px',
  },
}
