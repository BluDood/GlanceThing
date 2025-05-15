import { updateWeather } from '../weather.js'

import { HandlerAction } from '../../types/WebSocketHandler.js'

export const name = 'weather'

export const hasActions = true

export const actions: HandlerAction[] = [
  {
    action: 'refresh',
    handle: async () => {
      await updateWeather()
    }
  },
]