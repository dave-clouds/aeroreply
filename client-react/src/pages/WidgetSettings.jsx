import { useEffect, useState } from 'react'
import { MessageCircle, MessageSquare, Headphones, CheckCircle, AlertCircle } from 'lucide-react'
import api from '../services/api'

// ── Icon option catalogue ─────────────────────────────────────────────────────
const ICON_OPTIONS = [
  {
    value: 'speech-bubble',
    label: 'Speech Bubble',
    Icon: MessageCircle,
    desc: 'Classic chat bubble',
  },
  {
    value: 'message',
    label: 'Message',
    Icon: MessageSquare,
    desc: 'Simple message box',
  },
  {
    value: 'headset',
    label: 'Headset',
    Icon: Headphones,
    desc: 'Support / helpdesk',
  },
]

const DEFAULTS = {
  widgetTitle: 'Live Support',
  widgetSubtitle: 'Typically replies in minutes',
  primaryColor: '#0f172a',
  textIconColor: '#ffffff',
  widgetIcon: 'speech-bubble',
  position: 'right',
  offset: 20,
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function WidgetSettings() {
  const [form, setForm] = useState(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null) // { type: 'success'|'error', msg }

  // Load existing settings on mount
  useEffect(() => {
    api
      .get('/auth/me')
      .then((res) => {
        if (res.data.widgetSettings) {
          setForm((prev) => ({ ...prev, ...res.data.widgetSettings }))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function patch(key, val) {
    setForm((prev) => ({ ...prev, [key]: val }))
    setToast(null)
  }

  async function handleSave() {
    setSaving(true)
    setToast(null)
    try {
      await api.patch('/user/widget-settings', form)
      setToast({ type: 'success', msg: 'Widget settings saved successfully.' })
    } catch (err) {
      setToast({
        type: 'error',
        msg: err?.response?.data?.error?.message || 'Failed to save settings. Please try again.',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <style>{`@keyframes ar-spin { to { transform: rotate(360deg); } }`}</style>
        <div style={styles.loadingWrap}>
          <div style={styles.spinner} />
          <span style={{ color: '#6b7280', fontSize: '14px' }}>Loading widget settings…</span>
        </div>
      </div>
    )
  }

  // Live preview colours
  const previewBg = form.primaryColor || '#0f172a'
  const previewFg = form.textIconColor || '#ffffff'
  const selectedIconOption = ICON_OPTIONS.find((o) => o.value === form.widgetIcon) || ICON_OPTIONS[0]
  const PreviewIcon = selectedIconOption.Icon

  return (
    <div style={styles.page}>
      {/* ── Page header ── */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Widget Settings</h1>
          <p style={styles.pageSubtitle}>
            Customise the look and feel of your embeddable chat widget.
          </p>
        </div>

        {/* Live mini-preview */}
        <div style={styles.previewWrap} title="Live preview of your launcher button">
          <span style={styles.previewLabel}>Preview</span>
          <div
            style={{
              ...styles.previewLauncher,
              background: previewBg,
              color: previewFg,
            }}
          >
            <PreviewIcon size={22} strokeWidth={2} color={previewFg} />
          </div>
        </div>
      </div>

      {/* ── Cards ── */}
      <div style={styles.cardGrid}>

        {/* ── Card 1: Header & Title ── */}
        <div style={styles.card}>
          <p style={styles.cardLabel}>HEADER &amp; TITLE</p>
          <h2 style={styles.cardTitle}>Widget Text Content</h2>
          <p style={styles.cardDesc}>
            Set the name and tagline your visitors see in the chat header.
          </p>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>
              Chat Window Title
              <input
                type="text"
                value={form.widgetTitle}
                onChange={(e) => patch('widgetTitle', e.target.value)}
                placeholder="Live Support"
                maxLength={60}
                style={styles.input}
              />
            </label>
            <label style={styles.label}>
              Subtitle / Status Line
              <input
                type="text"
                value={form.widgetSubtitle}
                onChange={(e) => patch('widgetSubtitle', e.target.value)}
                placeholder="Typically replies in minutes"
                maxLength={80}
                style={styles.input}
              />
            </label>
          </div>
        </div>

        {/* ── Card 2: Chat Icon Branding ── */}
        <div style={styles.card}>
          <p style={styles.cardLabel}>CHAT ICON BRANDING</p>
          <h2 style={styles.cardTitle}>Launcher Icon</h2>
          <p style={styles.cardDesc}>
            Choose the icon that appears on the floating launcher button.
          </p>
          <div style={styles.iconGrid}>
            {ICON_OPTIONS.map(({ value, label, Icon, desc }) => {
              const selected = form.widgetIcon === value
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => patch('widgetIcon', value)}
                  style={{
                    ...styles.iconCard,
                    ...(selected ? styles.iconCardSelected : {}),
                  }}
                >
                  <div
                    style={{
                      ...styles.iconCircle,
                      background: selected ? previewBg : '#1f2937',
                    }}
                  >
                    <Icon size={20} strokeWidth={2} color={selected ? previewFg : '#9ca3af'} />
                  </div>
                  <span style={{ ...styles.iconLabel, ...(selected ? { color: '#f9fafb' } : {}) }}>
                    {label}
                  </span>
                  <span style={styles.iconDesc}>{desc}</span>
                  {selected && (
                    <CheckCircle
                      size={14}
                      strokeWidth={2.5}
                      color="#60a5fa"
                      style={{ position: 'absolute', top: '8px', right: '8px' }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Card 3: Theme Colors ── */}
        <div style={styles.card}>
          <p style={styles.cardLabel}>THEME COLORS</p>
          <h2 style={styles.cardTitle}>Colour Scheme</h2>
          <p style={styles.cardDesc}>
            Primary colour is applied to the launcher, header, and send button.
            Contrast colour is used for all text and icons on top of the primary.
          </p>
          <div style={styles.colorRow}>
            {/* Primary color */}
            <label style={styles.colorLabel}>
              <span style={styles.label}>Primary Colour</span>
              <div style={styles.colorPickerWrap}>
                <div
                  style={{
                    ...styles.colorSwatch,
                    background: form.primaryColor,
                  }}
                >
                  <input
                    type="color"
                    value={form.primaryColor}
                    onChange={(e) => patch('primaryColor', e.target.value)}
                    style={styles.colorInput}
                    title="Pick primary colour"
                  />
                </div>
                <input
                  type="text"
                  value={form.primaryColor}
                  onChange={(e) => {
                    const v = e.target.value
                    if (/^#[0-9a-fA-F]{0,6}$/.test(v)) patch('primaryColor', v)
                  }}
                  maxLength={7}
                  style={{ ...styles.input, flex: 1, fontFamily: 'monospace', fontSize: '13px' }}
                />
              </div>
            </label>

            {/* Text / icon contrast color */}
            <label style={styles.colorLabel}>
              <span style={styles.label}>Text &amp; Icon Colour</span>
              <div style={styles.colorPickerWrap}>
                <div
                  style={{
                    ...styles.colorSwatch,
                    background: form.textIconColor,
                    border: '1px solid #374151',
                  }}
                >
                  <input
                    type="color"
                    value={form.textIconColor}
                    onChange={(e) => patch('textIconColor', e.target.value)}
                    style={styles.colorInput}
                    title="Pick text / icon colour"
                  />
                </div>
                <input
                  type="text"
                  value={form.textIconColor}
                  onChange={(e) => {
                    const v = e.target.value
                    if (/^#[0-9a-fA-F]{0,6}$/.test(v)) patch('textIconColor', v)
                  }}
                  maxLength={7}
                  style={{ ...styles.input, flex: 1, fontFamily: 'monospace', fontSize: '13px' }}
                />
              </div>
            </label>
          </div>

          {/* Combined swatch preview */}
          <div style={styles.swatchPreview}>
            <div style={{ ...styles.swatchChip, background: previewBg }}>
              <span style={{ color: previewFg, fontSize: '12px', fontWeight: 600 }}>
                Aa Primary
              </span>
            </div>
            <div style={{ ...styles.swatchChip, background: '#1f2937', border: '1px solid #374151' }}>
              <span style={{ color: '#f9fafb', fontSize: '12px' }}>
                Chat background (unchanged)
              </span>
            </div>
          </div>
        </div>

        {/* ── Card 4: Positioning ── */}
        <div style={styles.card}>
          <p style={styles.cardLabel}>POSITIONING</p>
          <h2 style={styles.cardTitle}>Widget Position &amp; Offset</h2>
          <p style={styles.cardDesc}>
            Choose which corner the launcher floats in and how far from the screen edge it sits.
          </p>

          {/* Left / Right toggle */}
          <div style={styles.positionRow}>
            {['right', 'left'].map((pos) => {
              const selected = form.position === pos
              return (
                <button
                  key={pos}
                  type="button"
                  onClick={() => patch('position', pos)}
                  style={{
                    ...styles.posCard,
                    ...(selected ? styles.posCardSelected : {}),
                  }}
                >
                  {/* Tiny widget diagram */}
                  <div style={styles.posDiagram}>
                    <div
                      style={{
                        ...styles.posDot,
                        [pos]: '6px',
                        background: selected ? previewBg : '#374151',
                      }}
                    />
                  </div>
                  <span style={{ ...styles.posLabel, ...(selected ? { color: '#f9fafb' } : {}) }}>
                    Bottom {pos.charAt(0).toUpperCase() + pos.slice(1)}
                  </span>
                  {selected && (
                    <CheckCircle
                      size={14}
                      strokeWidth={2.5}
                      color="#60a5fa"
                      style={{ position: 'absolute', top: '8px', right: '8px' }}
                    />
                  )}
                </button>
              )
            })}
          </div>

          {/* Pixel offset */}
          <label style={{ ...styles.label, marginTop: '20px', display: 'block' }}>
            Edge Offset (px)
            <p style={{ ...styles.cardDesc, marginTop: '2px', marginBottom: '8px' }}>
              Distance between the launcher and the screen edge.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="range"
                min={8}
                max={80}
                step={1}
                value={form.offset}
                onChange={(e) => patch('offset', Number(e.target.value))}
                style={{ flex: 1, accentColor: '#60a5fa' }}
              />
              <input
                type="number"
                min={8}
                max={80}
                value={form.offset}
                onChange={(e) => {
                  const n = Number(e.target.value)
                  if (!isNaN(n)) patch('offset', Math.max(8, Math.min(80, n)))
                }}
                style={{ ...styles.input, width: '68px', textAlign: 'center' }}
              />
              <span style={{ color: '#6b7280', fontSize: '13px', flexShrink: 0 }}>px</span>
            </div>
          </label>
        </div>
      </div>

      {/* ── Toast message ── */}
      {toast && (
        <div
          style={{
            ...styles.toast,
            background: toast.type === 'success' ? '#052e16' : '#450a0a',
            border: `1px solid ${toast.type === 'success' ? '#166534' : '#7f1d1d'}`,
          }}
        >
          {toast.type === 'success' ? (
            <CheckCircle size={16} strokeWidth={2} color="#4ade80" />
          ) : (
            <AlertCircle size={16} strokeWidth={2} color="#f87171" />
          )}
          <span style={{ color: toast.type === 'success' ? '#4ade80' : '#f87171' }}>
            {toast.msg}
          </span>
        </div>
      )}

      {/* ── Save button ── */}
      <div style={styles.saveBar}>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{ ...styles.saveBtn, ...(saving ? styles.saveBtnDisabled : {}) }}
        >
          {saving ? 'Saving…' : '✦  Save All Settings'}
        </button>
        <p style={styles.saveHint}>
          Changes apply to your widget.js embed the next time a visitor connects.
        </p>
      </div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  page: {
    flex: 1,
    padding: '32px 36px 60px',
    background: '#0b0f19',
    minHeight: '100vh',
    fontFamily: 'system-ui, sans-serif',
    color: '#f9fafb',
    overflowY: 'auto',
  },
  loadingWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    minHeight: '40vh',
  },
  spinner: {
    width: '28px',
    height: '28px',
    border: '3px solid #1f2937',
    borderTop: '3px solid #60a5fa',
    borderRadius: '50%',
    animation: 'ar-spin 0.8s linear infinite',
  },

  // Page header
  pageHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '32px',
    gap: '20px',
    flexWrap: 'wrap',
  },
  pageTitle: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#f9fafb',
    margin: 0,
    letterSpacing: '-0.4px',
  },
  pageSubtitle: {
    margin: '4px 0 0',
    color: '#6b7280',
    fontSize: '14px',
  },

  // Live preview launcher
  previewWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    flexShrink: 0,
  },
  previewLabel: {
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.06em',
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  previewLauncher: {
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    transition: 'background 0.2s, color 0.2s',
  },

  // Card grid
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))',
    gap: '20px',
  },
  card: {
    background: '#111827',
    border: '1px solid #1f2937',
    borderRadius: '14px',
    padding: '22px 24px 26px',
    position: 'relative',
  },
  cardLabel: {
    margin: '0 0 4px',
    fontSize: '10.5px',
    fontWeight: 700,
    letterSpacing: '0.1em',
    color: '#60a5fa',
    textTransform: 'uppercase',
  },
  cardTitle: {
    margin: '0 0 4px',
    fontSize: '15px',
    fontWeight: 700,
    color: '#f9fafb',
    letterSpacing: '-0.2px',
  },
  cardDesc: {
    margin: '0 0 18px',
    fontSize: '13px',
    color: '#6b7280',
    lineHeight: 1.55,
  },

  // Form fields
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#9ca3af',
  },
  input: {
    background: '#1f2937',
    border: '1px solid #374151',
    borderRadius: '8px',
    padding: '9px 12px',
    color: '#f9fafb',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  },

  // Icon selection grid
  iconGrid: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  iconCard: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    padding: '14px 18px',
    background: '#0f1623',
    border: '1px solid #1f2937',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'border-color 0.15s, background 0.15s',
    minWidth: '100px',
    fontFamily: 'inherit',
  },
  iconCardSelected: {
    border: '1px solid #3b82f6',
    background: '#0c1a2e',
  },
  iconCircle: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.15s',
  },
  iconLabel: {
    fontSize: '12.5px',
    fontWeight: 600,
    color: '#9ca3af',
    transition: 'color 0.15s',
  },
  iconDesc: {
    fontSize: '11px',
    color: '#4b5563',
  },

  // Color pickers
  colorRow: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
  },
  colorLabel: {
    flex: 1,
    minWidth: '160px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  colorPickerWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  colorSwatch: {
    width: '38px',
    height: '38px',
    borderRadius: '8px',
    flexShrink: 0,
    position: 'relative',
    cursor: 'pointer',
    overflow: 'hidden',
  },
  colorInput: {
    position: 'absolute',
    inset: 0,
    opacity: 0,
    width: '100%',
    height: '100%',
    cursor: 'pointer',
    border: 'none',
    padding: 0,
  },
  swatchPreview: {
    display: 'flex',
    gap: '10px',
    marginTop: '18px',
    flexWrap: 'wrap',
  },
  swatchChip: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 14px',
    borderRadius: '8px',
    flex: 1,
    minWidth: '120px',
  },

  // Positioning cards
  positionRow: {
    display: 'flex',
    gap: '12px',
  },
  posCard: {
    position: 'relative',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '14px 10px',
    background: '#0f1623',
    border: '1px solid #1f2937',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'border-color 0.15s, background 0.15s',
    fontFamily: 'inherit',
  },
  posCardSelected: {
    border: '1px solid #3b82f6',
    background: '#0c1a2e',
  },
  posDiagram: {
    position: 'relative',
    width: '80px',
    height: '50px',
    background: '#1f2937',
    borderRadius: '6px',
    border: '1px solid #374151',
    overflow: 'hidden',
  },
  posDot: {
    position: 'absolute',
    bottom: '6px',
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    transition: 'background 0.15s',
  },
  posLabel: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#6b7280',
    transition: 'color 0.15s',
  },

  // Save bar
  saveBar: {
    marginTop: '32px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '8px',
  },
  saveBtn: {
    padding: '13px 36px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    letterSpacing: '0.01em',
    boxShadow: '0 6px 20px rgba(59,130,246,0.35)',
    transition: 'opacity 0.15s, transform 0.15s',
  },
  saveBtnDisabled: {
    opacity: 0.6,
    cursor: 'default',
    transform: 'none',
  },
  saveHint: {
    margin: 0,
    fontSize: '12.5px',
    color: '#4b5563',
  },

  // Toast
  toast: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    borderRadius: '10px',
    marginTop: '20px',
    fontSize: '13.5px',
    fontWeight: 500,
  },
}
