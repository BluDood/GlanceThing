import { Handler } from '../../types/WebSocketHandler.js'

import * as apps from './apps.js'
import * as lock from './lock.js'
import * as restore from './restore.js'
import * as sleep from './sleep.js'
import * as spotify from './spotify.js'
import * as time from './time.js'
import * as wake from './wake.js'

export const handlers: Handler[] = [
  apps,
  lock,
  restore,
  sleep,
  spotify,
  time,
  wake
]
