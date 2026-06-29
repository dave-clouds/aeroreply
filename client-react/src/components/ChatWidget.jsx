import { useEffect, useRef, useState } from 'react'
import { useSocket } from '../context/SocketContext'

function generateConversationId() {
  return 'conv-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now()
}

const CONVERSATION_KEY = 'aeroreply_conversation_id'

function getOrCreateConversationId() {
  let id = sessionStorage.getItem(CONVERSATION_KEY)
  if (!id) {
    id = generateConversationId()
    sessionStorage.setItem(CONVERSATION_KEY, id)
  }
  return id
}

export default function ChatWidget() {
  const { socket, connected } = useSocket()
  const [conversationId] = useState(getOrCreateConversationId)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [status, setStatus] = useState('open')
  const [serverError, setServerError] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (!socket) return

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
    }

    function onErrorInvalid({ error }) {
      setServerError(error)
    }

    socket.on('agent:reply', onAgentReply)
    socket.on('handoff:triggered', onHandoffTriggered)
    socket.on('ticket:closed', onTicketClosed)
    socket.on('error:server', onErrorServer)
    socket.on('error:invalid', onErrorInvalid)

    return () => {
      socket.off('agent:reply', onAgentReply)
      socket.off('handoff:triggered', onHandoffTriggered)
      socket.off('ticket:closed', onTicketClosed)
      socket.off('error:server', onErrorServer)
      socket.off('error:invalid', onErrorInvalid)
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

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <span style={styles.title}>AeroReply Support</span>
        <span style={{ ...styles.statusBadge, color: statusColor[status] }}>
          {statusLabel[status]}
        </span>
      </div>

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
        {serverError && (
          <div style={styles.errorBubble}>{serverError}</div>
        )}
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
    </div>
  )
}

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    width: '420px',
    height: '600px',
    border: '1px solid #374151',
    borderRadius: '12px',
    overflow: 'hidden',
    background: '#111827',
    fontFamily: 'system-ui, sans-serif',
    fontSize: '14px',
    color: '#f9fafb',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    background: '#1f2937',
    borderBottom: '1px solid #374151',
  },
  title: {
    fontWeight: 700,
    fontSize: '15px',
  },
  statusBadge: {
    fontSize: '12px',
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
