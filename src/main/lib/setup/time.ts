import cron from 'node-cron'

import { SetupFunction } from '../../types/WebSocketSetup.js'
import { updateTime } from '../time.js'

export const name = 'time'

export const setup: SetupFunction = async () => {
  // Set up a cron job to update time every minute
  const timeJob = cron.schedule('* * * * *', updateTime)

  return async () => {
    timeJob.stop()
  }
}