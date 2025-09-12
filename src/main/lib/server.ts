import { WebSocketServer } from 'ws'

import {
  findOpenPort,
  isDev,
  isPortOpen,
  log,
  LogLevel,
  safeParse
} from '../lib/utils.js'
import { getSocketPassword, getStorageValue } from './storage.js'
import { handlers } from './handlers/handlers.js'
import { runServerSetup } from './setup/setup.js'

import { AuthenticatedWebSocket } from '../types/WebSocketServer.js'

export let wss: WebSocketServer | null = null

let port: number | null = null

export async function getServerPort() {
  if (port) return port

  if (isDev()) {
    if (await isPortOpen(1337)) {
      port = 1337
      return port
    } else {
      log(
        'Port 1337 is already in use. Using a random available port instead.',
        'WebSocketServer'
      )
    }
  }

  port = await findOpenPort()

  return port
}

export async function isServerStarted() {
  return !!wss
}

export async function stopServer() {
  if (wss) {
    wss.clients.forEach(ws => ws.close())
    wss.close()
  }
}

export async function startServer() {
  if (wss) return

  const cleanup = await runServerSetup()

  const WS_PASSWORD = getSocketPassword()
  const port = await getServerPort()

  return new Promise<void>(resolve => {
    wss = new WebSocketServer({ port })

    wss.on('connection', (ws: AuthenticatedWebSocket) => {
      if (getStorageValue('disableSocketAuth') === true)
        ws.authenticated = true

      ws.on('message', async msg => {
        const d = safeParse(msg.toString())
        if (!d) return
        const { type, action, data } = d
        log(
          `Received ${type} ${action ?? ''}`,
          'WebSocketServer',
          LogLevel.DEBUG
        )

        if (type === 'auth') {
          if (data === WS_PASSWORD) {
            ws.authenticated = true
            ws.send(
              JSON.stringify({
                type: 'auth',
                data: 'Authenticated'
              })
            )
          } else {
            ws.send(
              JSON.stringify({
                type: 'error',
                data: 'Unauthorized'
              })
            )
          }
        }

        if (!ws.authenticated)
          return ws.send(
            JSON.stringify({
              type: 'error',
              data: 'Unauthorized'
            })
          )

        const handler = handlers.find(h => h.name === type)
        if (!handler) return

        if (!handler.hasActions) {
          await handler.handle(ws, data)
        } else {
          if (!action && handler.handle) {
            await handler.handle(ws, data)
          } else {
            const actionHandler = handler.actions.find(
              a => a.action === action
            )
            if (!actionHandler) return
            await actionHandler.handle(ws, data)
          }
        }
      })
    })

    wss.on('close', async () => {
      await cleanup()
      wss = null

      log('Closed', 'WebSocketServer')
    })

    wss.on('listening', () => {
      log(`Started on port ${port}`, 'WebSocketServer')
      resolve()
    })
  })
}
