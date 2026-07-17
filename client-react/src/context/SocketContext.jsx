import { createContext, useContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'

const SocketContext = createContext(null)

export function SocketProvider({ children }) {
  const { token, loading } = useAuth()
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)

  // The socket is (re)created whenever the auth token changes. Sending the
  // JWT in the handshake `auth` payload — rather than any client-supplied
  // projectId — is what lets the gateway verify *which* tenant this agent
  // belongs to and join them to the correct, isolated Socket.io room.
  // We wait for the initial session hydration (`loading`) to settle so an
  // agent's very first connection already carries their token.
  useEffect(() => {
    if (loading) return

    const s = io('/', {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: token ? { token } : {},
    })

    s.on('connect', () => setConnected(true))
    s.on('disconnect', () => setConnected(false))

    setSocket(s)

    return () => {
      s.disconnect()
    }
  }, [token, loading])

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  return useContext(SocketContext)
}
