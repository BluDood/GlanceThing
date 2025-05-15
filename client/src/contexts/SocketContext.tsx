import React, { createContext, useEffect, useRef, useState } from 'react'

import { getSocketPassword } from '@/lib/utils.ts'

interface SocketContextProps {
  ready: boolean
  firstLoad: boolean
  socket: WebSocket | null
}

const SocketContext = createContext<SocketContextProps>({
  ready: false,
  firstLoad: true,
  socket: null
})

interface SocketContextProviderProps {
  children: React.ReactNode
}

const SocketContextProvider = ({
  children
}: SocketContextProviderProps) => {
  const [ready, setReady] = useState(false)
  const ws = useRef<WebSocket | null>(null)
  const [firstLoad, setFirstLoad] = useState(true)

  function connect() {
    ws.current = new WebSocket('ws://localhost:1337')

    ws.current.onopen = async () => {
      const pass = await getSocketPassword()
      if (pass)
        ws.current?.send(
          JSON.stringify({
            type: 'auth',
            data: pass
          })
        )
      setReady(true)
      setTimeout(() => {
        setFirstLoad(false)
      }, 500)
    }

    ws.current.onclose = () => {
      setReady(false)
      setTimeout(() => {
        connect()
      }, 1000)
    }
  }

  useEffect(() => {
    connect()

    return () => {
      ws.current?.close()
    }
    // eslint-disable-next-line
  }, [])

  const missedPongsRef = useRef(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!ready) return

    const sendPing = () => {
      if (ws.current!.readyState === WebSocket.OPEN) {
        ws.current!.send(JSON.stringify({ type: 'ping' }))

        timeoutRef.current = setTimeout(() => {
          missedPongsRef.current += 1
          if (missedPongsRef.current >= 3) {
            ws.current?.close()
            ws.current?.onclose?.({} as CloseEvent)
            missedPongsRef.current = 0
          }
        }, 5000)
      }
    }

    const handleSocketMessage = (e: MessageEvent) => {
      const { type } = JSON.parse(e.data)
      if (type !== 'pong') return

      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      missedPongsRef.current = 0
    }

    ws.current!.addEventListener('message', handleSocketMessage)
    const interval = setInterval(sendPing, 5000)

    return () => {
      clearInterval(interval)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      ws.current!.removeEventListener('message', handleSocketMessage)
    }
  }, [ready])

  return (
    <SocketContext.Provider
      value={{
        ready,
        firstLoad,
        socket: ws.current
      }}
    >
      {children}
    </SocketContext.Provider>
  )
}

export { SocketContext, SocketContextProvider }