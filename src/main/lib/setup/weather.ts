import cron from 'node-cron'

import { SetupFunction } from '../../types/WebSocketSetup.js'
import { updateWeather } from '../weather.js'

export const name = 'weather'

export const setup: SetupFunction = async () => {
  const weatherJob = cron.schedule('0 * * * *', updateWeather)

  return async () => {
    weatherJob.stop()
  }
}
