import cron from 'node-cron'

import { wss } from '../server.js'

import { AuthenticatedWebSocket } from '../../types/WebSocketServer.js'
import { SetupFunction } from '../../types/WebSocketSetup.js'
import { formatDate } from '../time.js'

export const name = 'time'

export const setup: SetupFunction = async () => {
  async function updateTime() {
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

  const timeJob = cron.schedule('* * * * *', updateTime)

  return async () => {
    timeJob.stop()
  }
}
