import {
  CleanupFunction,
  SetupHandler
} from '../../types/WebSocketSetup.js'

import * as time from './time.js'
import * as playback from './playback.js'
import * as weather from './weather.js'

const setupHandlers: SetupHandler[] = [time, playback, weather]

export async function runServerSetup() {
  const cleanupFunctions: CleanupFunction[] = []
  for (const handler of setupHandlers) {
    const cleanup = await handler.setup()
    cleanupFunctions.push(cleanup)
  }

  return async () => {
    for (const cleanup of cleanupFunctions) {
      await cleanup()
    }
  }
}