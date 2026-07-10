import { useState } from 'react'

function buildEmbedSnippet(origin) {
  return `<script
  src="${origin}/widget.js"
  data-aeroreply-widget
  async
></script>`
}

// Settings Panel — business configuration screen, including the
// copy-paste embed snippet for the floating ChatWidget.
export default function Settings() {
  const [copied, setCopied] = useState(false)
  const snippet = buildEmbedSnippet(
    typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'
  )

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
        <h1 style={styles.title}>Settings</h1>
        <p style={styles.subtitle}>Business configuration for your AeroReply account.</p>
      </header>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Widget Integration</h2>
        <p style={styles.sectionDesc}>
          Copy this snippet into your website's HTML (just before the closing{' '}
          <code>&lt;/body&gt;</code> tag) to embed the AeroReply chat widget. Visitors
          will be connected to a live agent when one is online, or prompted to leave
          their email for a follow-up when no one is available.
        </p>

        <div style={styles.snippetBlock}>
          <pre style={styles.snippetPre}>
            <code>{snippet}</code>
          </pre>
          <button style={styles.copyBtn} onClick={copySnippet} type="button">
            {copied ? 'Copied!' : 'Copy Code'}
          </button>
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
  title: { margin: 0, fontSize: '24px', fontWeight: 800 },
  subtitle: { margin: '4px 0 0', color: '#9ca3af', fontSize: '14px' },
  section: {
    maxWidth: '640px',
  },
  sectionTitle: {
    margin: '0 0 8px',
    fontSize: '16px',
    fontWeight: 700,
  },
  sectionDesc: {
    margin: '0 0 16px',
    color: '#9ca3af',
    fontSize: '13px',
    lineHeight: 1.6,
  },
  snippetBlock: {
    position: 'relative',
    background: '#0b1120',
    border: '1px solid #374151',
    borderRadius: '10px',
    padding: '16px',
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
  },
}
