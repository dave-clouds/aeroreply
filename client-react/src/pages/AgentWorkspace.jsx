import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useSocket } from '../context/SocketContext'
import api from '../services/api'

// The live ticket queue + reply console for human agents. Customer
// interactions arrive here automatically (via socket events) — there is
// no separate "simulate a customer" tool inside the dashboard.
export default function AgentWorkspace() {
  const { socket, connected } = useSocket()

  const [tickets, setTickets] = useState([])
  const [fetchState, setFetchState] = useState('loading')
  const [fetchError, setFetchError] = useState(null)

  const [activeConv, setActiveConv] = useState(null)
  const [chatLog, setChatLog] = useState([])
  const [historyState, setHistoryState] = useState('idle')
  const [reply, setReply] = useState('')
  const [joinedConvs, setJoinedConvs] = useState(new Set())

  const bottomRef = useRef(null)
  const activeConvRef = useRef(null)
  const historyLoadedRef = useRef(false)
  const pendingMessagesRef = useRef([])
  const historyAbortRef = useRef(null)

  useEffect(() => {
    activeConvRef.current = activeConv
  }, [activeConv])

  useEffect(() => {
    const controller = new AbortController()

    // Fetched through the shared `api` instance so the JWT is attached —
    // the backend scopes the result to this agent's own project, so no
    // other tenant's tickets ever reach this queue.
    api
      .get('/tickets', { signal: controller.signal })
      .then(({ data }) => {
        setTickets(
          data.tickets.map((t) => ({
            conversationId: t.conversationId,
            lastMessage: null,
            timestamp: t.updatedAt,
            status: t.status,
          }))
        )
        setFetchState('done')
      })
      .catch((err) => {
        if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return
        setFetchError(err.message)
        setFetchState('error')
      })

    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!socket) return

    function onHandoffNewTicket({ conversationId, lastMessage, timestamp }) {
      setTickets((prev) => {
        const exists = prev.find((t) => t.conversationId === conversationId)
        if (exists) {
          return prev.map((t) =>
            t.conversationId === conversationId
              ? { ...t, lastMessage, timestamp, status: 'handoff' }
              : t
          )
        }
        return [{ conversationId, lastMessage, timestamp, status: 'handoff' }, ...prev]
      })
    }

    function onAgentCustomerMessage({ conversationId, message, timestamp }) {
      setTickets((prev) =>
        prev.map((t) =>
          t.conversationId === conversationId
            ? { ...t, lastMessage: message, timestamp }
            : t
        )
      )

      if (conversationId !== activeConvRef.current) return

      const entry = { role: 'customer', content: message, timestamp }

      if (!historyLoadedRef.current) {
        pendingMessagesRef.current.push(entry)
      } else {
        setChatLog((prev) => [...prev, entry])
      }
    }

    function onTicketClosed({ conversationId }) {
      setTickets((prev) =>
        prev.map((t) =>
          t.conversationId === conversationId ? { ...t, status: 'closed' } : t
        )
      )
      if (conversationId === activeConvRef.current) {
        const entry = {
          role: 'system',
          content: 'Ticket closed.',
          timestamp: new Date().toISOString(),
        }
        if (!historyLoadedRef.current) {
          pendingMessagesRef.current.push(entry)
        } else {
          setChatLog((prev) => [...prev, entry])
        }
      }
    }

    socket.on('handoff:new_ticket', onHandoffNewTicket)
    socket.on('agent:customer_message', onAgentCustomerMessage)
    socket.on('ticket:closed', onTicketClosed)

    return () => {
      socket.off('handoff:new_ticket', onHandoffNewTicket)
      socket.off('agent:customer_message', onAgentCustomerMessage)
      socket.off('ticket:closed', onTicketClosed)
    }
  }, [socket])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatLog])

  const openConversation = useCallback(
    async (conversationId) => {
      if (historyAbortRef.current) {
        historyAbortRef.current.abort()
      }

      const controller = new AbortController()
      historyAbortRef.current = controller

      setActiveConv(conversationId)
      activeConvRef.current = conversationId
      setChatLog([])
      setHistoryState('loading')
      historyLoadedRef.current = false
      pendingMessagesRef.current = []

      if (socket && !joinedConvs.has(conversationId)) {
        socket.emit('agent:join', { conversationId })
        setJoinedConvs((prev) => new Set(prev).add(conversationId))
      }

      try {
        const { data } = await api.get(`/tickets/${conversationId}`, {
          signal: controller.signal,
        })
        const { ticket } = data

        if (controller.signal.aborted) return

        const history = (ticket.messages ?? []).map((m) => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        }))

        const seen = new Set(history.map((m) => `${m.role}:${m.content}`))
        const fresh = pendingMessagesRef.current.filter(
          (m) => !seen.has(`${m.role}:${m.content}`)
        )

        setChatLog([...history, ...fresh])
        historyLoadedRef.current = true
        pendingMessagesRef.current = []
        setHistoryState('done')
      } catch (err) {
        if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return

        historyLoadedRef.current = true
        const buffered = pendingMessagesRef.current
        pendingMessagesRef.current = []
        if (buffered.length > 0) setChatLog(buffered)
        setHistoryState('error')
      }
    },
    [socket, joinedConvs]
  )

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

  const sortedTickets = [...tickets].sort((a, b) => {
    const rank = { handoff: 0, open: 1, closed: 2 }
    if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status]
    return new Date(b.timestamp) - new Date(a.timestamp)
  })

  const activeTicket = tickets.find((t) => t.conversationId === activeConv)
  const isClosed = activeTicket?.status === 'closed'

  function QueueContent() {
    if (fetchState === 'loading') {
      return (
        <div style={styles.feedbackWrap}>
          <div style={styles.spinner} />
          <p style={styles.feedbackText}>Loading tickets…</p>
        </div>
      )
    }
    if (fetchState === 'error') {
      return (
        <div style={styles.feedbackWrap}>
          <p style={{ ...styles.feedbackText, color: '#f87171' }}>
            Failed to load tickets
          </p>
          <p style={{ ...styles.feedbackText, fontSize: '11px', color: '#9ca3af' }}>
            {fetchError}
          </p>
          <p style={{ ...styles.feedbackText, fontSize: '11px', color: '#6b7280' }}>
            Real-time events will still appear below.
          </p>
        </div>
      )
    }
    if (sortedTickets.length === 0) {
      return <p style={styles.emptyHint}>No active tickets.</p>
    }
    return (
      <ul style={styles.ticketList}>
        {sortedTickets.map((t) => (
          <li
            key={t.conversationId}
            style={{
              ...styles.ticketItem,
              background:
                activeConv === t.conversationId ? '#374151' : 'transparent',
              opacity: t.status === 'closed' ? 0.45 : 1,
            }}
            onClick={() => openConversation(t.conversationId)}
          >
            <div style={styles.ticketId}>{t.conversationId}</div>
            <div style={styles.ticketPreview}>
              {t.lastMessage ?? (
                <span style={{ color: '#6b7280', fontStyle: 'italic' }}>
                  history — click to join
                </span>
              )}
            </div>
            <div style={styles.ticketMeta}>
              <span
                style={{
                  ...styles.statusPill,
                  background:
                    t.status === 'closed'
                      ? '#374151'
                      : t.status === 'open'
                      ? '#065f46'
                      : '#1d4ed8',
                }}
              >
                {t.status}
              </span>
              {t.timestamp && (
                <span style={styles.timeLabel}>
                  {new Date(t.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    )
  }

  function roleMeta(role) {
    if (role === 'agent') return { label: 'You', bg: '#10b981', align: 'flex-end' }
    if (role === 'ai') return { label: 'AI', bg: '#6d28d9', align: 'flex-start' }
    if (role === 'system') return { label: '', bg: '#374151', align: 'center' }
    return { label: 'Customer', bg: '#1f2937', align: 'flex-start' }
  }

  return (
    <div
      className={`aw-shell ${activeConv ? 'aw-has-active' : ''}`}
      style={styles.shell}
    >
      <style>{RESPONSIVE_CSS}</style>

      <aside className="aw-queue" style={styles.queueSidebar}>
        <div style={styles.queueHeader}>
          <span style={styles.queueTitle}>Ticket Queue</span>
          <div style={styles.headerRight}>
            {fetchState === 'done' && (
              <span style={styles.ticketCount}>{sortedTickets.length}</span>
            )}
            <span
              style={{
                ...styles.dot,
                background: connected ? '#22c55e' : '#f59e0b',
              }}
            />
          </div>
        </div>
        <QueueContent />
      </aside>

      <main className="aw-main" style={styles.main}>
        {!activeConv ? (
          <div style={styles.placeholder}>Select a ticket to start responding.</div>
        ) : (
          <>
            <div style={styles.convHeader}>
              <button
                type="button"
                className="aw-back-btn"
                style={styles.backBtn}
                onClick={() => setActiveConv(null)}
              >
                <ArrowLeft size={15} />
                Back to Tickets
              </button>
              <div style={styles.convMeta}>
                <span style={styles.convId}>{activeConv}</span>
                {historyState === 'loading' && (
                  <span style={styles.loadingChip}>
                    <span style={styles.chipSpinner} />
                    Loading history…
                  </span>
                )}
                {historyState === 'error' && (
                  <span style={{ ...styles.loadingChip, color: '#f87171' }}>
                    History unavailable — live mode
                  </span>
                )}
                {historyState === 'done' && (
                  <span style={{ ...styles.loadingChip, color: '#6b7280' }}>
                    {chatLog.length} message{chatLog.length !== 1 ? 's' : ''} loaded
                  </span>
                )}
              </div>
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
              {historyState === 'loading' && chatLog.length === 0 && (
                <div style={styles.historyLoader}>
                  <div style={styles.spinner} />
                  <p style={{ margin: '8px 0 0', color: '#6b7280', fontSize: '13px' }}>
                    Fetching conversation history…
                  </p>
                </div>
              )}
              {historyState !== 'loading' && chatLog.length === 0 && (
                <p style={styles.emptyHint}>No messages in this conversation yet.</p>
              )}
              {chatLog.map((msg, i) => {
                const { label, bg, align } = roleMeta(msg.role)
                return (
                  <div
                    key={i}
                    style={{
                      ...styles.bubble,
                      alignSelf: align,
                      background: bg,
                      fontStyle: msg.role === 'system' ? 'italic' : 'normal',
                      fontSize: msg.role === 'system' ? '12px' : '14px',
                    }}
                  >
                    {label && <span style={styles.bubbleSender}>{label}</span>}
                    <span>{msg.content}</span>
                    {msg.timestamp && msg.role !== 'system' && (
                      <span style={styles.bubbleTime}>
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={sendReply} style={styles.replyForm}>
              <input
                style={styles.input}
                type="text"
                placeholder={
                  isClosed
                    ? 'Ticket is closed.'
                    : historyState === 'loading'
                    ? 'Loading history…'
                    : 'Type a reply…'
                }
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

const RESPONSIVE_CSS = `
  .aw-back-btn { display: none; }

  @media (max-width: 860px) {
    .aw-queue, .aw-main { width: 100%; }

    .aw-shell.aw-has-active .aw-queue { display: none; }
    .aw-shell:not(.aw-has-active) .aw-main { display: none; }

    .aw-back-btn { display: flex !important; }
  }
`

const styles = {
  shell: {
    display: 'flex',
    flex: 1,
    minHeight: 0,
    background: '#111827',
    fontFamily: 'system-ui, sans-serif',
    fontSize: '14px',
    color: '#f9fafb',
  },
  queueSidebar: {
    width: '280px',
    borderRight: '1px solid #374151',
    display: 'flex',
    flexDirection: 'column',
    background: '#1f2937',
    flexShrink: 0,
  },
  queueHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    borderBottom: '1px solid #374151',
  },
  queueTitle: {
    fontWeight: 700,
    fontSize: '15px',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  ticketCount: {
    background: '#374151',
    color: '#d1d5db',
    fontSize: '11px',
    fontWeight: 700,
    padding: '1px 7px',
    borderRadius: '999px',
  },
  dot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    display: 'inline-block',
    flexShrink: 0,
  },
  feedbackWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '28px 16px',
  },
  feedbackText: {
    margin: 0,
    color: '#9ca3af',
    fontSize: '13px',
    textAlign: 'center',
  },
  spinner: {
    width: '22px',
    height: '22px',
    border: '2px solid #374151',
    borderTop: '2px solid #60a5fa',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    flexShrink: 0,
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusPill: {
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '999px',
    color: '#fff',
    fontWeight: 600,
  },
  timeLabel: {
    fontSize: '10px',
    color: '#6b7280',
  },
  emptyHint: {
    color: '#6b7280',
    textAlign: 'center',
    padding: '20px 12px',
    margin: 0,
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
    gap: '8px',
  },
  convMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
  },
  convId: {
    fontFamily: 'monospace',
    fontSize: '12px',
    color: '#9ca3af',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  loadingChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '11px',
    color: '#60a5fa',
  },
  chipSpinner: {
    width: '10px',
    height: '10px',
    border: '1.5px solid #374151',
    borderTop: '1.5px solid #60a5fa',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    flexShrink: 0,
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: '#374151',
    color: '#f9fafb',
    border: 'none',
    borderRadius: '8px',
    padding: '7px 12px',
    fontSize: '12.5px',
    fontWeight: 700,
    cursor: 'pointer',
    flexShrink: 0,
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
  },
  historyLoader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    padding: '40px 0',
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
    color: '#fff',
  },
  bubbleSender: {
    fontSize: '11px',
    opacity: 0.75,
    fontWeight: 600,
    marginBottom: '2px',
  },
  bubbleTime: {
    fontSize: '10px',
    opacity: 0.5,
    marginTop: '3px',
    alignSelf: 'flex-end',
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
