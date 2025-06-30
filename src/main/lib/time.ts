import moment from 'moment'
import { AuthenticatedWebSocket } from '../types/WebSocketServer.js'
import { wss } from './server.js'
import { getStorageValue } from './storage.js'

export function formatDate(d = new Date()) {
  const timeFormat = getStorageValue('timeFormat') || 'HH:mm'
  const dateFormat = getStorageValue('dateFormat') || 'ddd, D MMM'

  const time = moment(d).format(timeFormat)
  const date = moment(d).format(dateFormat)

  return {
    time,
    date
  }
}

export async function updateTime() {
  if (!wss) return

  wss.clients.forEach(async (ws: AuthenticatedWebSocket) => {
    if (!ws.authenticated && ws.readyState !== WebSocket.OPEN) return

    ws.send(
      JSON.stringify({
        type: 'time',
        data: formatDate()
      })
    )
  })
}
