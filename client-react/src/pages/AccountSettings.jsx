import { useAuth } from '../context/AuthContext'
import { User, Mail, Hash } from 'lucide-react'

// Account Settings panel — shows the authenticated user's Name, Email,
// and Project ID (the unique key used to scope their embedded widget).
export default function AccountSettings() {
  const { user } = useAuth()

  const fields = [
    { icon: User,  label: 'Name',       value: user?.name       ?? '—' },
    { icon: Mail,  label: 'Email',      value: user?.email      ?? '—' },
    { icon: Hash,  label: 'Project ID', value: user?.projectId  ?? '—' },
  ]

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>Account Settings</h1>
        <p style={styles.subtitle}>Your profile details and unique project identifier.</p>
      </header>

      <section style={styles.section}>
        {fields.map(({ icon: Icon, label, value }) => (
          <div key={label} style={styles.row}>
            <div style={styles.rowIcon}>
              <Icon size={16} strokeWidth={2} />
            </div>
            <div style={styles.rowBody}>
              <span style={styles.rowLabel}>{label}</span>
              <span style={styles.rowValue}>{value}</span>
            </div>
          </div>
        ))}
      </section>

      <p style={styles.hint}>
        To update your name, email, or password, contact your workspace admin.
      </p>
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
  header: { marginBottom: '28px' },
  title: { margin: 0, fontSize: '24px', fontWeight: 800, color: '#f9fafb' },
  subtitle: { margin: '4px 0 0', color: '#9ca3af', fontSize: '14px' },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxWidth: '520px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    background: '#111827',
    border: '1px solid #1f2937',
    borderRadius: '10px',
    padding: '14px 18px',
  },
  rowIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '34px',
    height: '34px',
    borderRadius: '8px',
    background: 'rgba(59,130,246,0.12)',
    color: '#60a5fa',
    flexShrink: 0,
  },
  rowBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
  },
  rowLabel: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  rowValue: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#f9fafb',
    wordBreak: 'break-all',
  },
  hint: {
    marginTop: '24px',
    color: '#6b7280',
    fontSize: '12.5px',
    maxWidth: '520px',
  },
}
