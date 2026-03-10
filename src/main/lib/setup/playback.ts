import dns from 'dns'
import { playbackManager } from '../playback/playback.js'
import { getStorageValue } from '../storage.js'
import { wss } from '../server.js'
import { log } from '../utils.js'

import { AuthenticatedWebSocket } from '../../types/WebSocketServer.js'
import { SetupFunction } from '../../types/WebSocketSetup.js'

export const name = 'playback'

const MIN_RETRY_DELAY = 5000
const MAX_RETRY_DELAY = 300000
const NETWORK_CHECK_INTERVAL = 10000

let currentRetryDelay = MIN_RETRY_DELAY
let lastLogMessage = ''
let lastLogTime = 0
let reconnectTimeout: NodeJS.Timeout | null = null
let networkCheckInterval: NodeJS.Timeout | null = null
let isWaitingForNetwork = false

function deduplicatedLog(message: string, scope: string): void {
  const now = Date.now()
  if (message === lastLogMessage && now - lastLogTime < 60000) {
    return
  }
  lastLogMessage = message
  lastLogTime = now
  log(message, scope)
}

function checkNetworkConnectivity(): Promise<boolean> {
  return new Promise(resolve => {
    dns.lookup('spotify.com', err => {
      resolve(!err)
    })
  })
}

async function attemptReconnect(playbackHandler: string): Promise<void> {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout)
    reconnectTimeout = null
  }

  const isOnline = await checkNetworkConnectivity()

  if (!isOnline) {
    if (!isWaitingForNetwork) {
      deduplicatedLog(
        'Network unavailable, waiting for connectivity...',
        'PlaybackManager'
      )
      isWaitingForNetwork = true
    }

    if (!networkCheckInterval) {
      networkCheckInterval = setInterval(async () => {
        const online = await checkNetworkConnectivity()
        if (online) {
          if (networkCheckInterval) {
            clearInterval(networkCheckInterval)
            networkCheckInterval = null
          }
          isWaitingForNetwork = false
          currentRetryDelay = MIN_RETRY_DELAY
          deduplicatedLog(
            'Network restored, reconnecting...',
            'PlaybackManager'
          )
          await playbackManager.setup(playbackHandler)
        }
      }, NETWORK_CHECK_INTERVAL)
    }
    return
  }

  isWaitingForNetwork = false
  deduplicatedLog(
    `Attempting to reconnect in ${currentRetryDelay / 1000}s...`,
    'PlaybackManager'
  )

  reconnectTimeout = setTimeout(async () => {
    await playbackManager.setup(playbackHandler)
  }, currentRetryDelay)

  currentRetryDelay = Math.min(currentRetryDelay * 2, MAX_RETRY_DELAY)
}

export const setup: SetupFunction = async () => {
  const playbackHandler = getStorageValue('playbackHandler')

  playbackManager.on('playback', data => {
    if (!wss) return
    wss.clients.forEach(async (ws: AuthenticatedWebSocket) => {
      if (!ws.authenticated && ws.readyState !== WebSocket.OPEN) return

      ws.send(JSON.stringify({ type: 'playback', data }))
    })
  })

  playbackManager.on('close', async () => {
    deduplicatedLog('Connection closed', 'PlaybackManager')
    await playbackManager.cleanup()
    await attemptReconnect(playbackHandler)
  })

  playbackManager.on('open', (handlerName?: string) => {
    currentRetryDelay = MIN_RETRY_DELAY
    log(`Opened with handler ${handlerName}`, 'PlaybackManager')
  })

  playbackManager.on('error', err => {
    const errorMessage = err instanceof Error ? err.message : String(err)
    deduplicatedLog(`Error: ${errorMessage}`, 'PlaybackManager')
  })

  if (!playbackHandler || playbackHandler === 'none') {
    log('No handler set', 'Playback')
  } else {
    await playbackManager.setup(playbackHandler)
  }

  return async () => {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout)
      reconnectTimeout = null
    }
    if (networkCheckInterval) {
      clearInterval(networkCheckInterval)
      networkCheckInterval = null
    }
    await playbackManager.cleanup()
    playbackManager.removeAllListeners()
  }
}
