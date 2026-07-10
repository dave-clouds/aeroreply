import { useEffect, useRef, useState } from 'react'
import { Maximize2, Minimize2, Minus, X } from 'lucide-react'
import { useSocket } from '../context/SocketContext'

function generateConversationId() {
  return 'conv-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now()
}

const CONVERSATION_KEY = 'aeroreply_conversation_id'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function getOrCreateConversationId() {
  let id = sessionStorage.getItem(CONVERSATION_KEY)
  if (!id) {
    id = generateConversationId()
    sessionStorage.setItem(CONVERSATION_KEY, id)
  }
  return id
}

// Human-First with AI Fallback / Lead Capture:
// - If a human agent is online, the visitor gets the normal live chat.
// - If no agent is online, the widget skips straight to a lead-capture
//   frame so no potential customer is lost.
export default function ChatWidget() {
  const { socket, connected } = useSocket()
  const [conversationId] = useState(getOrCreateConversationId)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [status, setStatus] = useState('open')
  const [serverError, setServerError] = useState(null)

  // null = not yet known, true/false once the server tells us
  const [agentOnline, setAgentOnline] = useState(null)
  const [leadEmail, setLeadEmail] = useState('')
  const [leadSubmitted, setLeadSubmitted] = useState(false)
  const [leadError, setLeadError] = useState(null)

  // Widget frame controls — purely presentational, do not touch socket
  // state or any conversation/lead logic below.
  const [size, setSize] = useState('normal') // 'normal' | 'maximized' | 'minimized'
  const [hidden, setHidden] = useState(false)

  const bottomRef = useRef(null)

  useEffect(() => {
    if (!socket) return

    function onAgentStatus({ online }) {
      setAgentOnline(online)
    }

    function onAgentReply({ reply, sender, timestamp }) {
      setMessages((prev) => [
        ...prev,
        { role: sender === 'agent' ? 'agent' : 'ai', content: reply, timestamp },
      ])
      setServerError(null)
    }

    function onHandoffTriggered() {
      setStatus('handoff')
    }

    function onTicketClosed() {
      setStatus('closed')
    }

    function onErrorServer({ error }) {
      setServerError(error)
      setLeadError(error)
    }

    function onErrorInvalid({ error }) {
      setServerError(error)
      setLeadError(error)
    }

    function onLeadCaptured() {
      setLeadSubmitted(true)
      setLeadError(null)
    }

    socket.on('agent:status', onAgentStatus)
    socket.on('agent:reply', onAgentReply)
    socket.on('handoff:triggered', onHandoffTriggered)
    socket.on('ticket:closed', onTicketClosed)
    socket.on('error:server', onErrorServer)
    socket.on('error:invalid', onErrorInvalid)
    socket.on('lead:captured', onLeadCaptured)

    // Ask for the current status explicitly — the widget may mount after
    // the server's one-shot emit on connection has already fired (e.g. a
    // floating launcher opened well after the socket first connected).
    socket.emit('agent:status:request')

    return () => {
      socket.off('agent:status', onAgentStatus)
      socket.off('agent:reply', onAgentReply)
      socket.off('handoff:triggered', onHandoffTriggered)
      socket.off('ticket:closed', onTicketClosed)
      socket.off('error:server', onErrorServer)
      socket.off('error:invalid', onErrorInvalid)
      socket.off('lead:captured', onLeadCaptured)
    }
  }, [socket])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function sendMessage(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text || !socket || status === 'closed') return

    setMessages((prev) => [
      ...prev,
      { role: 'customer', content: text, timestamp: new Date().toISOString() },
    ])
    setInput('')
    setServerError(null)

    socket.emit('customer:message', { conversationId, message: text })
  }

  function submitLeadEmail(e) {
    e.preventDefault()
    const email = leadEmail.trim()
    if (!EMAIL_RE.test(email) || !socket) {
      setLeadError('Please enter a valid email address.')
      return
    }
    setLeadError(null)
    socket.emit('lead:capture_email', { conversationId, email })
  }

  const statusLabel = {
    open: connected ? '● Connected' : '○ Connecting…',
    handoff: '⟳ Connecting you to a human agent…',
    closed: '✓ Conversation closed',
  }

  const statusColor = {
    open: connected ? '#22c55e' : '#f59e0b',
    handoff: '#3b82f6',
    closed: '#6b7280',
  }

  // Still waiting to hear from the server about agent availability.
  const checkingAvailability = agentOnline === null

  if (hidden) return null

  const isMaximized = size === 'maximized'
  const isMinimized = size === 'minimized'

  return (
    <div
      style={{
        ...styles.wrapper,
        ...(isMaximized ? styles.wrapperMaximized : {}),
        ...(isMinimized ? styles.wrapperMinimized : {}),
      }}
    >
      <div style={styles.header}>
        <span style={styles.title}>AeroReply Support</span>

        <div style={styles.headerRight}>
          {!checkingAvailability && agentOnline === false ? (
            <span style={{ ...styles.statusBadge, color: '#f59e0b' }}>● Away</span>
          ) : (
            <span style={{ ...styles.statusBadge, color: statusColor[status] }}>
              {statusLabel[status]}
            </span>
          )}

          <div style={styles.headerControls}>
            <button
              type="button"
              style={styles.controlBtn}
              onClick={() => setSize((s) => (s === 'maximized' ? 'normal' : 'maximized'))}
              aria-label={isMaximized ? 'Restore chat window' : 'Maximize chat window'}
              title={isMaximized ? 'Restore' : 'Maximize'}
            >
              {isMaximized ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
            <button
              type="button"
              style={styles.controlBtn}
              onClick={() => setSize((s) => (s === 'minimized' ? 'normal' : 'minimized'))}
              aria-label={isMinimized ? 'Restore chat window' : 'Minimize chat window'}
              title={isMinimized ? 'Restore' : 'Minimize'}
            >
              <Minus size={15} />
            </button>
            <button
              type="button"
              style={styles.controlBtn}
              onClick={() => setHidden(true)}
              aria-label="Close chat widget"
              title="Close"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      </div>

      {!isMinimized && checkingAvailability && (
        <div style={styles.fallbackBody}>
          <p style={styles.fallbackHint}>Checking availability…</p>
        </div>
      )}

      {!isMinimized && !checkingAvailability && agentOnline === false && (
        <div style={styles.fallbackBody}>
          <p style={styles.fallbackMessage}>
            We're busy at the moment. Sorry about that. Leave us your email, and we
            will contact you as soon as possible...
          </p>

          {leadSubmitted ? (
            <p style={styles.fallbackSuccess}>
              Thanks! We've saved your email and will reach out shortly.
            </p>
          ) : (
            <form onSubmit={submitLeadEmail} style={styles.leadForm}>
              <input
                style={styles.input}
                type="email"
                placeholder="you@example.com"
                value={leadEmail}
                onChange={(e) => setLeadEmail(e.target.value)}
                disabled={!connected}
              />
              <button
                style={{ ...styles.sendBtn, opacity: !connected ? 0.5 : 1 }}
                type="submit"
                disabled={!connected}
              >
                Submit
              </button>
            </form>
          )}
          {leadError && <div style={styles.errorBubble}>{leadError}</div>}
        </div>
      )}

      {!isMinimized && !checkingAvailability && agentOnline === true && (
        <>
          <div style={styles.messageList}>
            {messages.length === 0 && (
              <p style={styles.emptyHint}>Send a message to start the conversation.</p>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  ...styles.bubble,
                  alignSelf: msg.role === 'customer' ? 'flex-end' : 'flex-start',
                  background:
                    msg.role === 'customer'
                      ? '#3b82f6'
                      : msg.role === 'agent'
                      ? '#10b981'
                      : '#374151',
                  color: '#fff',
                }}
              >
                <span style={styles.bubbleSender}>
                  {msg.role === 'customer' ? 'You' : msg.role === 'agent' ? 'Agent' : 'AI'}
                </span>
                <span>{msg.content}</span>
              </div>
            ))}
            {serverError && <div style={styles.errorBubble}>{serverError}</div>}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={sendMessage} style={styles.form}>
            <input
              style={styles.input}
              type="text"
              placeholder={status === 'closed' ? 'Conversation closed.' : 'Type a message…'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={status === 'closed' || !connected}
            />
            <button
              style={{
                ...styles.sendBtn,
                opacity: status === 'closed' || !connected ? 0.5 : 1,
              }}
              type="submit"
              disabled={status === 'closed' || !connected}
            >
              Send
            </button>
          </form>
        </>
      )}
    </div>
  )
}

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    width: '420px',
    height: '600px',
    border: '1px solid #2d3648',
    borderRadius: '18px',
    overflow: 'hidden',
    background: 'linear-gradient(180deg, #131a2a 0%, #0e1420 100%)',
    fontFamily: 'system-ui, sans-serif',
    fontSize: '14px',
    color: '#f9fafb',
    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
    transition: 'width 0.2s ease, height 0.2s ease',
  },
  wrapperMaximized: {
    width: 'min(92vw, 720px)',
    height: 'min(88vh, 820px)',
  },
  wrapperMinimized: {
    height: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    background: 'linear-gradient(135deg, #1e293b 0%, #172033 100%)',
    borderBottom: '1px solid #2d3648',
  },
  title: {
    fontWeight: 700,
    fontSize: '15px',
    letterSpacing: '-0.2px',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  headerControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    paddingLeft: '10px',
    borderLeft: '1px solid #374151',
  },
  controlBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '26px',
    height: '26px',
    border: 'none',
    borderRadius: '7px',
    background: 'transparent',
    color: '#9ca3af',
    cursor: 'pointer',
  },
  statusBadge: {
    fontSize: '12px',
  },
  fallbackBody: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: '14px',
    padding: '24px 20px',
  },
  fallbackHint: {
    color: '#6b7280',
    textAlign: 'center',
    margin: 0,
  },
  fallbackMessage: {
    margin: 0,
    lineHeight: 1.6,
    color: '#d1d5db',
  },
  fallbackSuccess: {
    margin: 0,
    color: '#4ade80',
    fontWeight: 600,
  },
  leadForm: {
    display: 'flex',
    gap: '8px',
  },
  messageList: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '12px 16px',
    overflowY: 'auto',
  },
  emptyHint: {
    color: '#6b7280',
    textAlign: 'center',
    marginTop: '40px',
  },
  bubble: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    maxWidth: '78%',
    padding: '8px 12px',
    borderRadius: '10px',
    lineHeight: '1.45',
    wordBreak: 'break-word',
  },
  bubbleSender: {
    fontSize: '11px',
    opacity: 0.75,
    fontWeight: 600,
    marginBottom: '2px',
  },
  errorBubble: {
    background: '#7f1d1d',
    color: '#fca5a5',
    padding: '8px 12px',
    borderRadius: '8px',
    fontSize: '13px',
  },
  form: {
    display: 'flex',
    gap: '8px',
    padding: '10px 12px',
    borderTop: '1px solid #374151',
    background: '#1f2937',
  },
  input: {
    flex: 1,
    background: '#374151',
    border: '1px solid #4b5563',
    borderRadius: '8px',
    padding: '8px 12px',
    color: '#f9fafb',
    fontSize: '14px',
    outline: 'none',
  },
  sendBtn: {
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 16px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '14px',
  },
}
