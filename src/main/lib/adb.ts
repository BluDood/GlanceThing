import { app } from 'electron'
import { platform } from 'os'
import axios from 'axios'
import path from 'path'
import fs from 'fs'

import {
  execAsync,
  getLogLevel,
  getPlatformADB,
  getPlatformTar,
  log,
  LogLevel
} from './utils.js'
import { getServerPort } from './server.js'
import { getSocketPassword } from './storage.js'
import { getWebAppDir } from './webapp.js'

export async function getAdbExecutable() {
  const res = await execAsync('adb version').catch(() => null)

  if (res && platform() !== 'darwin') return 'adb'

  const { downloadURL, executable } = getPlatformADB()
  const userDataPath = app.getPath('userData')
  const platformToolsPath = path.join(userDataPath, 'platform-tools')
  const adbPath = path.join(platformToolsPath, executable)

  if (fs.existsSync(adbPath)) return `"${adbPath}"`

  log('Downloading ADB...', 'adb')

  const downloadPath = path.join(
    app.getPath('temp'),
    'platform-tools-glancething-temp.zip'
  )

  if (fs.existsSync(downloadPath)) fs.unlinkSync(downloadPath)

  const download = await axios.get(downloadURL, {
    responseType: 'stream',
    validateStatus: () => true
  })

  if (download.status !== 200) {
    log('Failed to download adb', 'adb', LogLevel.ERROR)
    throw new Error('adb_download_failed')
  }

  const writer = fs.createWriteStream(downloadPath)

  download.data.pipe(writer)

  await new Promise((resolve, reject) => {
    writer.on('finish', resolve)
    writer.on('error', reject)
  })

  log('Downloaded ADB!', 'adb')

  const extract = await execAsync(
    `${getPlatformTar()} -xf ${downloadPath} -C "${userDataPath}"`
  )

  if (extract === null) {
    log('Failed to extract adb', 'adb')
    throw new Error('adb_extract_failed')
  }

  log('Extracted ADB!', 'adb')

  return `"${adbPath}"`
}

async function getDevices() {
  const adb = await getAdbExecutable()
  const res = await execAsync(`${adb} devices`)

  const devices = res
    .split('\n')
    .filter(line => line.includes('\tdevice'))
    .map(line => line.split('\t')[0])

  return devices
}

async function checkValidDevice(device: string) {
  const adb = await getAdbExecutable()
  const res = await execAsync(
    `${adb} -s ${device} shell ls /usr/share/qt-superbird-app/webapp/`
  )

  return !res.includes('No such file or directory')
}

let carThingFound = false

export async function findCarThing() {
  log('Finding CarThing...', 'adb', LogLevel.DEBUG)
  const logLevel = getLogLevel()
  const devices = await getDevices()

  for (const device of devices) {
    if (await checkValidDevice(device)) {
      if (logLevel === LogLevel.DEBUG)
        log(`Found CarThing: ${device}`, 'adb', LogLevel.DEBUG)
      else if (!carThingFound) {
        log(`Found CarThing: ${device}`, 'adb')
        carThingFound = true
      }
      return device
    }
  }

  if (logLevel === LogLevel.DEBUG)
    log('No valid CarThing found', 'adb', LogLevel.DEBUG)
  else if (carThingFound) {
    log('CarThing no longer found', 'adb', LogLevel.WARN)
    carThingFound = false
  }

  return null
}

async function restartChromium(device: string | null) {
  if (!device) device = await findCarThing()
  if (!device) throw new Error('No valid CarThing found')

  const adb = await getAdbExecutable()

  log('Restarting Chromium...', 'adb', LogLevel.DEBUG)
  await execAsync(
    `${adb} -s ${device} shell "supervisorctl restart chromium"`
  )
  log('Restarted Chromium!', 'adb', LogLevel.DEBUG)
}

export async function setAutoBrightness(
  device: string | null,
  enabled: boolean
) {
  if (!device) device = await findCarThing()
  if (!device) throw new Error('No valid CarThing found')

  const adb = await getAdbExecutable()
  log(
    `Turning ${enabled ? 'on' : 'off'} auto brightness...`,
    'adb',
    LogLevel.DEBUG
  )
  await execAsync(
    `${adb} -s ${device} shell "supervisorctl ${enabled ? 'start' : 'stop'} backlight"`
  )
}

export async function getAutoBrightness(device: string | null) {
  if (!device) device = await findCarThing()
  if (!device) throw new Error('No valid CarThing found')

  const adb = await getAdbExecutable()
  log('Getting auto brightness...', 'adb', LogLevel.DEBUG)
  const res = await execAsync(
    `${adb} -s ${device} shell "supervisorctl status backlight"`
  )

  return res.includes('RUNNING')
}

function parseBrightness(brightness: string) {
  return 1 - parseInt(brightness) / 255
}

function formatBrightness(brightness: number) {
  return 255 - Math.round(brightness * 255)
}

export async function getBrightness(device: string | null, parse = true) {
  if (!device) device = await findCarThing()
  if (!device) throw new Error('No valid CarThing found')

  const adb = await getAdbExecutable()

  const res = await execAsync(
    `${adb} -s ${device} shell "cat /sys/devices/platform/backlight/backlight/aml-bl/brightness"`
  )

  return parse ? parseBrightness(res) : parseInt(res)
}

export async function setBrightness(
  device: string | null,
  brightness: number
) {
  if (!device) device = await findCarThing()
  if (!device) throw new Error('No valid CarThing found')

  const adb = await getAdbExecutable()

  const formatted = formatBrightness(brightness)

  await execAsync(
    `${adb} -s ${device} shell "echo ${formatted} > /sys/devices/platform/backlight/backlight/aml-bl/brightness"`
  )
}

export async function setBrightnessSmooth(
  device: string | null,
  brightness: number,
  steps = 10
) {
  if (!device) device = await findCarThing()
  if (!device) throw new Error('No valid CarThing found')

  const adb = await getAdbExecutable()
  log('Setting brightness smoothly...', 'adb', LogLevel.DEBUG)
  const currentValue = await getBrightness(device, false)
  const targetValue = Math.max(formatBrightness(brightness), 1)

  for (let i = 1; i <= steps; i++) {
    const value = Math.round(
      currentValue + (targetValue - currentValue) * (i / steps)
    )

    await execAsync(
      `${adb} -s ${device} shell "echo ${value} > /sys/devices/platform/backlight/backlight/aml-bl/brightness"`
    )
  }
}

export async function restore(device: string | null, restart = true) {
  if (!device) device = await findCarThing()
  if (!device) throw new Error('No valid CarThing found')

  const adb = await getAdbExecutable()

  log('Restoring original app...', 'adb', LogLevel.DEBUG)
  await execAsync(
    `${adb} -s ${device} shell "mountpoint /usr/share/qt-superbird-app/webapp/ > /dev/null && umount /usr/share/qt-superbird-app/webapp"`
  )
  await execAsync(`${adb} -s ${device} shell "rm -rf /tmp/webapp"`)
  log('Restored original app!', 'adb', LogLevel.DEBUG)
  if (restart) await restartChromium(device)
}

export async function rebootCarThing(device: string | null) {
  if (!device) device = await findCarThing()
  if (!device) throw new Error('No valid CarThing found')

  const adb = await getAdbExecutable()

  log('Reboot...', 'adb', LogLevel.DEBUG)
  await execAsync(`${adb} -s ${device} shell "reboot"`)
}

export async function installApp(device: string | null) {
  if (!device) device = await findCarThing()
  if (!device) throw new Error('No valid CarThing found')

  const appDir = await getWebAppDir()

  const WS_PASSWORD = getSocketPassword()

  await restore(device, false)

  const adb = await getAdbExecutable()

  log('Installing app...', 'adb')
  await execAsync(`${adb} -s ${device} push ${appDir} /tmp/webapp`)
  await execAsync(
    `${adb} -s ${device} shell "echo ${WS_PASSWORD} > /tmp/webapp/ws-password"`
  )
  await execAsync(
    `${adb} -s ${device} shell "touch /tmp/webapp/.glancething"`
  )
  await execAsync(
    `${adb} -s ${device} shell "mount --bind /tmp/webapp /usr/share/qt-superbird-app/webapp"`
  )
  await restartChromium(device)
  log('Installed app!', 'adb')
}

export async function checkInstalledApp(device: string | null) {
  if (!device) device = await findCarThing()
  if (!device) throw new Error('No valid CarThing found')

  const adb = await getAdbExecutable()

  const res = await execAsync(
    `${adb} -s ${device} shell ls /usr/share/qt-superbird-app/webapp/.glancething`
  )

  return !res.includes('No such file or directory')
}

export async function forwardSocketServer(device: string | null) {
  if (!device) device = await findCarThing()
  if (!device) throw new Error('No valid CarThing found')

  const adb = await getAdbExecutable()
  const port = await getServerPort()

  await execAsync(`${adb} -s ${device} reverse tcp:1337 tcp:${port}`)

  log('Forwarded socket server!', 'adb', LogLevel.DEBUG)
}
