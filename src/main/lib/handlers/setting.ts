import { HandlerFunction } from '../../types/WebSocketHandler.js'
import { getClientSettings } from '../setting.js'

export const name = 'setting'

export const hasActions = false

export const handle: HandlerFunction = async ws => {
  ws.send(
    JSON.stringify({
      type: 'setting',
      data: getClientSettings()
    })
  )
}
