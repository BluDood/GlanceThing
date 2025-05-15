import moment from 'moment'
import { AuthenticatedWebSocket } from '../types/WebSocketServer.js'
import { wss } from './server.js'
import { getStorageValue } from './storage.js'

export function formatDate(d = new Date()) {
  const timeFormat = getStorageValue('timeFormat') || 'HH:mm'
  const dateFormat = getStorageValue('dateFormat') || 'ddd, D MMM'

  const time = moment(d).format(timeFormat)
  const date = moment(d).format(dateFormat)
  const dateTime = moment(d).format('YYYY-MM-DD HH:mm:ss')

  return {
    time,
    date,
    dateTime,
    timeFormat,
    dateFormat
  }
}

export async function updateTime(): Promise<void> {
  if (!wss) return

  wss.clients.forEach(async (ws: AuthenticatedWebSocket) => {
    if (!ws.authenticated) return

    if (ws.readyState === 1) {
      ws.send(
        JSON.stringify({
          type: 'time',
          data: formatDate()
        })
      )
    }
  })
}