import { useEffect, useRef, useState } from 'react'
import { useSocket } from '../context/SocketContext'

export default function AgentDashboard() {
  const { socket, connected } = useSocket()
  const [tickets, setTickets] = useState([])
  const [activeConv, setActiveConv] = useState(null)
  const [chatLog, setChatLog] = useState([])
  const [reply, setReply] = useState('')
  const [joinedConvs, setJoinedConvs] = useState(new Set())
  const bottomRef = useRef(null)

  useEffect(() => {
    if (!socket) return

    socket.emit('agent:join', {})

    function onAgentJoined({ conversationId }) {
      if (conversationId) {
        setJoinedConvs((prev) => new Set(prev).add(conversationId))
      }
    }

    function onHandoffNewTicket({ conversationId, lastMessage, timestamp }) {
      setTickets((prev) => {
        if (prev.find((t) => t.conversationId === conversationId)) return prev
        return [{ conversationId, lastMessage, timestamp, status: 'handoff' }, ...prev]
      })
    }

    function onAgentCustomerMessage({ conversationId, message, timestamp }) {
      if (conversationId === activeConvRef.current) {
        setChatLog((prev) => [
          ...prev,
          { role: 'customer', content: message, timestamp },
        ])
      }
    }

    function onTicketClosed({ conversationId }) {
      setTickets((prev) =>
        prev.map((t) =>
          t.conversationId === conversationId ? { ...t, status: 'closed' } : t
        )
      )
      if (conversationId === activeConvRef.current) {
        setChatLog((prev) => [
          ...prev,
          {
            role: 'system',
            content: 'Ticket closed.',
            timestamp: new Date().toISOString(),
          },
        ])
      }
    }

    socket.on('agent:joined', onAgentJoined)
    socket.on('handoff:new_ticket', onHandoffNewTicket)
    socket.on('agent:customer_message', onAgentCustomerMessage)
    socket.on('ticket:closed', onTicketClosed)

    return () => {
      socket.off('agent:joined', onAgentJoined)
      socket.off('handoff:new_ticket', onHandoffNewTicket)
      socket.off('agent:customer_message', onAgentCustomerMessage)
      socket.off('ticket:closed', onTicketClosed)
    }
  }, [socket])

  const activeConvRef = useRef(activeConv)
  useEffect(() => {
    activeConvRef.current = activeConv
  }, [activeConv])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatLog])

  function openConversation(conversationId) {
    setActiveConv(conversationId)
    setChatLog([])
    if (!joinedConvs.has(conversationId)) {
      socket.emit('agent:join', { conversationId })
    }
  }

  function sendReply(e) {
    e.preventDefault()
    const text = reply.trim()
    if (!text || !socket || !activeConv) return

    socket.emit('agent:message', { conversationId: activeConv, message: text })
    setChatLog((prev) => [
      ...prev,
      { role: 'agent', content: text, timestamp: new Date().toISOString() },
    ])
    setReply('')
  }

  function closeTicket() {
    if (!socket || !activeConv) return
    socket.emit('ticket:close', { conversationId: activeConv })
  }

  const activeTicket = tickets.find((t) => t.conversationId === activeConv)
  const isClosed = activeTicket?.status === 'closed'

  return (
    <div style={styles.shell}>
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <span style={styles.sidebarTitle}>Agent Dashboard</span>
          <span
            style={{
              ...styles.dot,
              background: connected ? '#22c55e' : '#f59e0b',
            }}
          />
        </div>

        {tickets.length === 0 ? (
          <p style={styles.emptyHint}>No handoff tickets yet.</p>
        ) : (
          <ul style={styles.ticketList}>
            {tickets.map((t) => (
              <li
                key={t.conversationId}
                style={{
                  ...styles.ticketItem,
                  background:
                    activeConv === t.conversationId ? '#374151' : 'transparent',
                  opacity: t.status === 'closed' ? 0.5 : 1,
                }}
                onClick={() => openConversation(t.conversationId)}
              >
                <div style={styles.ticketId}>{t.conversationId}</div>
                <div style={styles.ticketPreview}>{t.lastMessage}</div>
                <div style={styles.ticketMeta}>
                  <span
                    style={{
                      ...styles.statusPill,
                      background: t.status === 'closed' ? '#374151' : '#1d4ed8',
                    }}
                  >
                    {t.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <main style={styles.main}>
        {!activeConv ? (
          <div style={styles.placeholder}>Select a ticket to start responding.</div>
        ) : (
          <>
            <div style={styles.convHeader}>
              <span style={styles.convId}>{activeConv}</span>
              <button
                style={{
                  ...styles.closeBtn,
                  opacity: isClosed ? 0.4 : 1,
                  cursor: isClosed ? 'not-allowed' : 'pointer',
                }}
                onClick={closeTicket}
                disabled={isClosed}
              >
                Close Ticket
              </button>
            </div>

            <div style={styles.chatLog}>
              {chatLog.length === 0 && (
                <p style={styles.emptyHint}>
                  Waiting for messages from the customer…
                </p>
              )}
              {chatLog.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    ...styles.bubble,
                    alignSelf:
                      msg.role === 'agent'
                        ? 'flex-end'
                        : msg.role === 'system'
                        ? 'center'
                        : 'flex-start',
                    background:
                      msg.role === 'agent'
                        ? '#10b981'
                        : msg.role === 'system'
                        ? '#374151'
                        : '#1f2937',
                    color: '#fff',
                    fontStyle: msg.role === 'system' ? 'italic' : 'normal',
                    fontSize: msg.role === 'system' ? '12px' : '14px',
                  }}
                >
                  <span style={styles.bubbleSender}>
                    {msg.role === 'agent'
                      ? 'You'
                      : msg.role === 'system'
                      ? ''
                      : 'Customer'}
                  </span>
                  {msg.content}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={sendReply} style={styles.replyForm}>
              <input
                style={styles.input}
                type="text"
                placeholder={isClosed ? 'Ticket is closed.' : 'Type a reply…'}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                disabled={isClosed || !connected}
              />
              <button
                style={{
                  ...styles.sendBtn,
                  opacity: isClosed || !connected ? 0.5 : 1,
                }}
                type="submit"
                disabled={isClosed || !connected}
              >
                Reply
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  )
}

const styles = {
  shell: {
    display: 'flex',
    width: '900px',
    height: '620px',
    border: '1px solid #374151',
    borderRadius: '12px',
    overflow: 'hidden',
    background: '#111827',
    fontFamily: 'system-ui, sans-serif',
    fontSize: '14px',
    color: '#f9fafb',
  },
  sidebar: {
    width: '280px',
    borderRight: '1px solid #374151',
    display: 'flex',
    flexDirection: 'column',
    background: '#1f2937',
    flexShrink: 0,
  },
  sidebarHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    borderBottom: '1px solid #374151',
  },
  sidebarTitle: {
    fontWeight: 700,
    fontSize: '15px',
  },
  dot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    display: 'inline-block',
  },
  ticketList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    overflowY: 'auto',
    flex: 1,
  },
  ticketItem: {
    padding: '10px 14px',
    cursor: 'pointer',
    borderBottom: '1px solid #374151',
    transition: 'background 0.15s',
  },
  ticketId: {
    fontSize: '11px',
    color: '#9ca3af',
    fontFamily: 'monospace',
    marginBottom: '3px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  ticketPreview: {
    fontSize: '13px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    marginBottom: '5px',
  },
  ticketMeta: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  statusPill: {
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '999px',
    color: '#fff',
    fontWeight: 600,
  },
  emptyHint: {
    color: '#6b7280',
    textAlign: 'center',
    padding: '20px 12px',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  placeholder: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6b7280',
  },
  convHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 16px',
    borderBottom: '1px solid #374151',
    background: '#1f2937',
  },
  convId: {
    fontFamily: 'monospace',
    fontSize: '12px',
    color: '#9ca3af',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  closeBtn: {
    background: '#dc2626',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '5px 12px',
    fontSize: '12px',
    fontWeight: 600,
    flexShrink: 0,
    marginLeft: '8px',
  },
  chatLog: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '12px 16px',
    overflowY: 'auto',
  },
  bubble: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    maxWidth: '75%',
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
  replyForm: {
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
    background: '#10b981',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 16px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '14px',
  },
}
