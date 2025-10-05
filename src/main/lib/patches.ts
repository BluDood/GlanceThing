import { app } from 'electron'
import path from 'path'

import { findCarThing, getAdbExecutable } from './adb.js'
import { execAsync, log } from './utils.js'

interface Patch {
  name: string
  description: string
  apply: () => void | Promise<void>
  checkInstalled: () => boolean | Promise<boolean>
}

const patchesFolder = path.join(
  process.env.NODE_ENV === 'development'
    ? app.getAppPath()
    : `${path.join(process.resourcesPath, 'app.asar.unpacked')}`,
  'resources',
  'common',
  'patches'
)

const patches: Patch[] = [
  {
    name: 'usb',
    description:
      'Fix CarThing ADB to restart USB after the host reboots/sleeps',
    apply: async () => {
      const usbPatchesPath = path.join(patchesFolder, 'usb')
      const usbgadgetPath = path.join(usbPatchesPath, 'S49usbgadget')
      const restartUsb = path.join(usbPatchesPath, 'restart_usb')
      const usbRules = path.join(usbPatchesPath, '50-usb.rules')

      const device = await findCarThing()
      if (!device) throw new Error('No valid CarThing found')

      const adb = await getAdbExecutable()
      await execAsync(`${adb} -s ${device} shell "mount -o remount,rw /"`)

      await execAsync(
        `${adb} -s ${device} push "${usbgadgetPath}" /etc/init.d/S49usbgadget`
      )
      await execAsync(
        `${adb} -s ${device} push "${restartUsb}" /sbin/restart_usb`
      )
      await execAsync(
        `${adb} -s ${device} push "${usbRules}" /etc/udev/rules.d/50-usb.rules`
      )
      await execAsync(
        `${adb} -s ${device} shell "chmod +x /etc/init.d/S49usbgadget"`
      )
      await execAsync(
        `${adb} -s ${device} shell "chmod +x /sbin/restart_usb"`
      )
      await execAsync(
        `${adb} -s ${device} shell "chmod +x /etc/udev/rules.d/50-usb.rules"`
      )

      await execAsync(`${adb} -s ${device} shell "sync"`)

      await new Promise(r => setTimeout(r, 5000))

      await execAsync(`${adb} -s ${device} shell "mount -o remount,ro /"`)
      await execAsync(`${adb} -s ${device} shell "reboot"`)
    },
    checkInstalled: async () => {
      const device = await findCarThing()
      if (!device) return false

      const adb = await getAdbExecutable()

      const res = await execAsync(
        `${adb} -s ${device} shell "ls /sbin/restart_usb"`
      )

      return !res.includes('No such file or directory')
    }
  }
]

export async function applyPatch(patchName: string) {
  const patch = patches.find(p => p.name === patchName)
  if (!patch) throw new Error(`Patch ${patchName} not found`)

  log(`Applying ${patchName}`, 'Patches')
  await patch.apply()
}

export async function getPatches() {
  const device = await findCarThing()
  if (!device) return false

  return await Promise.all(
    patches.map(async p => ({
      name: p.name,
      description: p.description,
      installed: await p.checkInstalled()
    }))
  )
}
