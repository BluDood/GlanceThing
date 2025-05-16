import { app, safeStorage } from 'electron'
import path from 'path'
import fs from 'fs'

import { log, LogLevel, random, safeParse, setLogLevel } from './utils.js'
import { setAutoBrightness, setBrightnessSmooth } from './adb.js'
import { updateTime } from './time.js'
import { notifyClientsOfSettingChanges } from './setting.js'

let storage = {}

const storageValueHandlers: Record<string, (value: unknown) => void> = {
  launchOnStartup: async value => {
    app.setLoginItemSettings({
      openAtLogin: value as boolean
    })
  },
  timeFormat: updateTime,
  dateFormat: updateTime,
  autoBrightness: async value => {
    await setAutoBrightness(null, value as boolean)
  },
  brightness: async value => {
    await setBrightnessSmooth(null, value as number)
  },
  logLevel: async value => setLogLevel(value as LogLevel),
  showStatusBar: notifyClientsOfSettingChanges,
  showTimeWidget: notifyClientsOfSettingChanges,
  showWeatherWidget: notifyClientsOfSettingChanges,
  showAppsWidget: notifyClientsOfSettingChanges,
  showControlsWidget: notifyClientsOfSettingChanges,
  showLyricsWidget: notifyClientsOfSettingChanges,
  showNothingPlayingNote: notifyClientsOfSettingChanges,
  showTimeOnScreensaver: notifyClientsOfSettingChanges,
  screensaverTimePosition: notifyClientsOfSettingChanges,
  showTempUnit: notifyClientsOfSettingChanges,
  autoSwitchToLyrics: notifyClientsOfSettingChanges,
  showTimeInStatusBar: notifyClientsOfSettingChanges,
  showWeatherInStatusBar: notifyClientsOfSettingChanges
}

function getStoragePath() {
  const userDataPath = app.getPath('userData')
  const storagePath = path.join(userDataPath, 'storage.json')

  if (!fs.existsSync(storagePath))
    fs.writeFileSync(storagePath, '{}', 'utf8')

  return storagePath
}

export function loadStorage() {
  log('Loading storage file', 'Storage', LogLevel.DEBUG)
  const storagePath = getStoragePath()
  const content = fs.readFileSync(storagePath, 'utf8')
  const parsed = safeParse(content)

  if (parsed) {
    storage = parsed
  } else {
    log(
      'Failed to parse storage file, using empty object.',
      'Storage',
      LogLevel.ERROR
    )
    storage = {}
  }

  log('Loaded storage file', 'Storage')
}

function writeStorage(storage: Record<string, unknown>) {
  const storagePath = getStoragePath()
  fs.writeFileSync(storagePath, JSON.stringify(storage, null, 2), 'utf8')
}

export function getStorageValue(key: string, secure = false) {
  log(`Getting value for key: ${key}`, 'Storage', LogLevel.DEBUG)
  const value = storage[key]

  if (value === undefined) return null

  if (secure) {
    if (!safeStorage.isEncryptionAvailable()) {
      log(
        'Encryption is not available, returning value as is.',
        'Storage',
        LogLevel.WARN
      )
      return value
    }
    return safeStorage.decryptString(Buffer.from(value, 'hex')).toString()
  } else {
    return value
  }
}

export function setStorageValue(
  key: string,
  value: unknown,
  secure = false
) {
  log(`Setting value for key: ${key}`, 'Storage', LogLevel.DEBUG)
  if (secure) {
    if (!safeStorage.isEncryptionAvailable()) {
      log(
        'WARNING: Encryption is not available, storing value as is.',
        'Storage',
        LogLevel.WARN
      )
    } else {
      value = safeStorage.encryptString(String(value)).toString('hex')
    }
  }

  storage[key] = value

  writeStorage(storage)

  const handler = storageValueHandlers[key]

  if (handler) {
    log(`Running handler for key: ${key}`, 'Storage', LogLevel.DEBUG)
    handler(value)
  }
}

export function getSocketPassword() {
  let socketPassword = getStorageValue('socketPassword', true)
  if (!socketPassword) {
    socketPassword = random(64)
    setStorageValue('socketPassword', socketPassword, true)
  }
  return socketPassword
}

export function getPlaybackHandlerConfig(handler: string) {
  const config = getStorageValue(`playbackConfig.${handler}`, true)
  if (config) return JSON.parse(Buffer.from(config, 'base64').toString())
  return null
}

export function setPlaybackHandlerConfig(
  handler: string,
  config: unknown
) {
  setStorageValue(
    `playbackConfig.${handler}`,
    Buffer.from(JSON.stringify(config)).toString('base64'),
    true
  )
}
