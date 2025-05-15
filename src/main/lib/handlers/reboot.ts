import { rebootCarThing } from '../adb.js'

import { HandlerFunction } from '../../types/WebSocketHandler.js'

export const name = 'reboot'

export const hasActions = false

export const handle: HandlerFunction = async () => {
  await rebootCarThing(null)
}
