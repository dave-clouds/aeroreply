import { useEffect, useState } from 'react'
import { useSocket } from '../context/SocketContext'

// Live Visitors — real-time active customer socket traffic.
export default function LiveVisitors() {
  const { socket, connected } = useSocket()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!socket) return

    function onVisitorsCount({ count: c }) {
      setCount(c)
    }

    socket.on('visitors:count', onVisitorsCount)
    return () => socket.off('visitors:count', onVisitorsCount)
  }, [socket])

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>Live Visitors</h1>
        <p style={styles.subtitle}>
          Real-time count of customers currently connected to the chat widget.
        </p>
      </header>

      <div style={styles.card}>
        <div style={styles.count}>{connected ? count : '—'}</div>
        <div style={styles.label}>Active visitor{count === 1 ? '' : 's'} right now</div>
        <div style={styles.status}>
          <span
            style={{
              ...styles.dot,
              background: connected ? '#22c55e' : '#f59e0b',
            }}
          />
          {connected ? 'Live' : 'Connecting…'}
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: {
    padding: '28px 32px',
    color: '#f9fafb',
    fontFamily: 'system-ui, sans-serif',
    flex: 1,
    overflowY: 'auto',
  },
  header: { marginBottom: '24px' },
  title: { margin: 0, fontSize: '24px', fontWeight: 800 },
  subtitle: { margin: '4px 0 0', color: '#9ca3af', fontSize: '14px', maxWidth: '480px' },
  card: {
    background: '#1f2937',
    border: '1px solid #374151',
    borderRadius: '12px',
    padding: '32px',
    maxWidth: '320px',
    textAlign: 'center',
  },
  count: {
    fontSize: '56px',
    fontWeight: 800,
    lineHeight: 1,
  },
  label: {
    marginTop: '8px',
    color: '#9ca3af',
    fontSize: '13px',
  },
  status: {
    marginTop: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#9ca3af',
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    display: 'inline-block',
  },
}
