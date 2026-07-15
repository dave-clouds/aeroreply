import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

function buildEmbedSnippet(origin, projectId) {
  return `<script
  src="${origin}/widget.js"
  data-aeroreply-project-id="${projectId}"
  async
></script>`
}

// Integration Code panel — shows the tenant's unique, copy-paste embed
// snippet. The snippet is generated dynamically using the authenticated
// user's projectId so every account gets its own isolated widget script.
export default function Settings() {
  const { user } = useAuth()
  const [copied, setCopied] = useState(false)

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'
  const projectId = user?.projectId ?? 'YOUR_PROJECT_ID'
  const snippet = buildEmbedSnippet(origin, projectId)

  async function copySnippet() {
    try {
      await navigator.clipboard.writeText(snippet)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>Integration Code</h1>
        <p style={styles.subtitle}>Your unique widget snippet — scoped exclusively to your project.</p>
      </header>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Embed the Chat Widget</h2>
        <p style={styles.sectionDesc}>
          Paste this snippet into your website's HTML just before the closing{' '}
          <code style={styles.inlineCode}>&lt;/body&gt;</code> tag. The{' '}
          <code style={styles.inlineCode}>data-aeroreply-project-id</code> attribute is your
          unique project key — all messages and tickets will be routed exclusively to your
          agent dashboard and no one else's.
        </p>

        <div style={styles.snippetBlock}>
          <pre style={styles.snippetPre}>
            <code>{snippet}</code>
          </pre>
          <button style={styles.copyBtn} onClick={copySnippet} type="button">
            {copied ? '✓ Copied!' : 'Copy Code'}
          </button>
        </div>

        <div style={styles.projectIdRow}>
          <span style={styles.projectIdLabel}>Your Project ID</span>
          <code style={styles.projectIdValue}>{projectId}</code>
        </div>
      </section>
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
  title: { margin: 0, fontSize: '24px', fontWeight: 800, color: '#f9fafb' },
  subtitle: { margin: '4px 0 0', color: '#9ca3af', fontSize: '14px' },
  section: { maxWidth: '640px' },
  sectionTitle: { margin: '0 0 8px', fontSize: '16px', fontWeight: 700, color: '#f9fafb' },
  sectionDesc: { margin: '0 0 16px', color: '#9ca3af', fontSize: '13px', lineHeight: 1.6 },
  inlineCode: {
    background: '#1f2937',
    color: '#93c5fd',
    padding: '1px 5px',
    borderRadius: '4px',
    fontSize: '12px',
    fontFamily: 'monospace',
  },
  snippetBlock: {
    position: 'relative',
    background: '#0b1120',
    border: '1px solid #374151',
    borderRadius: '10px',
    padding: '16px',
    marginBottom: '14px',
  },
  snippetPre: {
    margin: 0,
    fontFamily: 'monospace',
    fontSize: '13px',
    color: '#93c5fd',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    paddingRight: '96px',
  },
  copyBtn: {
    position: 'absolute',
    top: '14px',
    right: '14px',
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  projectIdRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: '#111827',
    border: '1px solid #1f2937',
    borderRadius: '8px',
    padding: '10px 14px',
  },
  projectIdLabel: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
    flexShrink: 0,
  },
  projectIdValue: {
    fontFamily: 'monospace',
    fontSize: '13px',
    color: '#a78bfa',
    wordBreak: 'break-all',
  },
}
