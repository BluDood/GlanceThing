import {
  app,
  shell,
  BrowserWindow,
  ipcMain,
  Tray,
  Menu,
  Notification,
  protocol,
  net,
  nativeImage
} from 'electron'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { join } from 'path'
import os from 'os'

import {
  getPlaybackHandlerConfig,
  getStorageValue,
  loadStorage,
  setPlaybackHandlerConfig,
  setStorageValue
} from './lib/storage.js'
import { applyPatch, getPatches } from './lib/patches.js'
import {
  clearLogs,
  downloadLogs,
  getLogs,
  isDev,
  log,
  LogLevel,
  setLogLevel
} from './lib/utils.js'
import { startServer, stopServer, isServerStarted } from './lib/server.js'
import {
  findCarThing,
  rebootCarThing,
  installApp,
  checkInstalledApp,
  forwardSocketServer,
  getAdbExecutable,
  getBrightness,
  setBrightnessSmooth,
  getAutoBrightness,
  setAutoBrightness
} from './lib/adb.js'
import {
  getShortcuts,
  addShortcut,
  removeShortcut,
  updateShortcut,
  uploadShortcutImage,
  getShortcutImagePath,
  removeShortcutImage,
  updateApps
} from './lib/shortcuts.js'

import icon from '../../resources/icon.png?asset'
import trayIcon from '../../resources/tray.png?asset'
import { playbackManager } from './lib/playback/playback.js'
import {
  hasCustomWebApp,
  importCustomWebApp,
  removeCustomWebApp
} from './lib/webapp.js'
import {
  uploadScreensaverImage,
  removeScreensaverImage,
  hasCustomScreensaverImage
} from './lib/screensaver.js'
import { updateWeather } from './lib/weather'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    },
    titleBarStyle: 'hidden',
    resizable: false,
    maximizable: false,
    minimizable: false
  })

  mainWindow.on('ready-to-show', async () => {
    mainWindow!.show()
    mainWindow!.center()
    mainWindow?.setWindowButtonVisibility?.(false)
    app.dock?.show()
  })

  mainWindow.on('closed', () => {
    const firstClose = getStorageValue('firstClose')

    if (firstClose !== false) {
      setStorageValue('firstClose', false)

      new Notification({
        title: 'Still Running!',
        body: 'GlanceThing has been minimized to the system tray, and is still running in the background!'
      }).show()
    }
    mainWindow = null
    app.dock?.hide()
  })

  mainWindow.webContents.setWindowOpenHandler(details => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.on('second-instance', () => {
  if (mainWindow) {
    mainWindow.focus()
  } else {
    createWindow()
  }
})

app.on('ready', async () => {
  log('Welcome!', 'GlanceThing')

  const gotLock = app.requestSingleInstanceLock()
  if (!gotLock) return app.quit()

  loadStorage()
  setLogLevel(getStorageValue('logLevel') ?? LogLevel.INFO)

  if (
    process.env.NODE_ENV === 'development' &&
    getStorageValue('devMode') === null
  ) {
    setStorageValue('devMode', true)
  }
  if (isDev()) log('Running in development mode', 'GlanceThing')
  electronApp.setAppUserModelId('com.bludood.glancething')

  const adbPath = await getAdbExecutable().catch(err => ({ err }))

  if (typeof adbPath === 'object' && adbPath.err) {
    log(
      `Failed to get ADB executable: ${adbPath.err.message}`,
      'adb',
      LogLevel.ERROR
    )
  } else {
    if (adbPath === 'adb') log('Using system adb', 'adb')
    else log(`Using downloaded ADB from path: ${adbPath}`, 'adb')
  }

  if (getStorageValue('setupComplete') === true) await startServer()

  await setupIpcHandlers()
  await setupTray()

  protocol.handle('shortcut', req => {
    const name = req.url.split('/').pop()
    if (!name) return new Response(null, { status: 404 })
    const path = getShortcutImagePath(name.split('?')[0])
    if (!path) return new Response(null, { status: 404 })
    return net.fetch(`file://${path}`)
  })

  if (getStorageValue('launchMinimized') !== true) createWindow()
  else app.dock?.hide()
})

app.on('browser-window-created', (_, window) => {
  optimizer.watchWindowShortcuts(window)
})

app.on('window-all-closed', () => {
  // don't quit the process
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

enum IPCHandler {
  FindCarThing = 'findCarThing',
  FindSetupCarThing = 'findSetupCarThing',
  RebootCarThing = 'rebootCarThing',
  InstallApp = 'installApp',
  StartServer = 'startServer',
  StopServer = 'stopServer',
  IsServerStarted = 'isServerStarted',
  ForwardSocketServer = 'forwardSocketServer',
  GetVersion = 'getVersion',
  GetStorageValue = 'getStorageValue',
  SetStorageValue = 'setStorageValue',
  TriggerCarThingStateUpdate = 'triggerCarThingStateUpdate',
  UploadShortcutImage = 'uploadShortcutImage',
  RemoveNewShortcutImage = 'removeNewShortcutImage',
  GetShortcuts = 'getShortcuts',
  AddShortcut = 'addShortcut',
  RemoveShortcut = 'removeShortcut',
  UpdateShortcut = 'updateShortcut',
  IsDevMode = 'isDevMode',
  GetBrightness = 'getBrightness',
  SetBrightness = 'setBrightness',
  GetPatches = 'getPatches',
  ApplyPatch = 'applyPatch',
  ValidateConfig = 'validateConfig',
  GetPlaybackHandlerConfig = 'getPlaybackHandlerConfig',
  SetPlaybackHandlerConfig = 'setPlaybackHandlerConfig',
  RestartPlaybackHandler = 'restartPlaybackHandler',
  HasCustomClient = 'hasCustomClient',
  ImportCustomClient = 'importCustomClient',
  RemoveCustomClient = 'removeCustomClient',
  GetLogs = 'getLogs',
  ClearLogs = 'clearLogs',
  DownloadLogs = 'downloadLogs',
  UploadScreensaverImage = 'uploadScreensaverImage',
  RemoveScreensaverImage = 'removeScreensaverImage',
  HasCustomScreensaverImage = 'hasCustomScreensaverImage',
  UpdateWeather = 'updateWeather'
}

async function setupIpcHandlers() {
  ipcMain.handle(IPCHandler.FindCarThing, async () => {
    const found = await findCarThing().catch(err => ({ err }))
    if (typeof found !== 'string' && found?.err) return found.err.message
    return !!found
  })

  ipcMain.handle(IPCHandler.FindSetupCarThing, async () => {
    const found = await findCarThing()
    if (!found) return 'not_found'

    const installed = await checkInstalledApp(found)
    if (!installed) return 'not_installed'

    return 'ready'
  })

  ipcMain.handle(IPCHandler.RebootCarThing, async () => {
    await rebootCarThing(null)
  })

  ipcMain.handle(IPCHandler.InstallApp, async () => {
    const res = await installApp(null).catch(err => ({ err }))
    if (res?.err) return res.err.message
    return true
  })

  ipcMain.handle(IPCHandler.StartServer, async () => {
    await startServer()
  })

  ipcMain.handle(IPCHandler.StopServer, async () => {
    await stopServer()
  })

  ipcMain.handle(IPCHandler.IsServerStarted, async () => {
    return await isServerStarted()
  })

  ipcMain.handle(IPCHandler.ForwardSocketServer, async () => {
    await forwardSocketServer(null)
  })

  ipcMain.handle(IPCHandler.GetVersion, () => {
    return app.getVersion()
  })

  ipcMain.handle(IPCHandler.GetStorageValue, (_event, key) => {
    return getStorageValue(key)
  })

  ipcMain.handle(IPCHandler.SetStorageValue, (_event, key, value) => {
    return setStorageValue(key, value)
  })

  async function carThingStateUpdate() {
    const found = await findCarThing().catch(err => {
      log(
        `Got an error while finding CarThing: ${err.message}`,
        'CarThingState',
        LogLevel.ERROR
      )
      return null
    })

    if (found) {
      const installed = await checkInstalledApp(found)

      if (installed) {
        mainWindow?.webContents.send('carThingState', 'ready')
        await forwardSocketServer(found)

        const autoBrightness = getStorageValue('autoBrightness') ?? true
        if ((await getAutoBrightness(found)) !== autoBrightness)
          setAutoBrightness(found, autoBrightness)

        if (!autoBrightness) {
          const brightness = getStorageValue('brightness') ?? 0.5
          if ((await getBrightness(found)) !== brightness)
            setBrightnessSmooth(found, brightness)
        }
      } else {
        const willAutoInstall = getStorageValue('installAutomatically')
        if (willAutoInstall) {
          mainWindow?.webContents.send('carThingState', 'installing')
          await installApp(found)
        } else {
          mainWindow?.webContents.send('carThingState', 'not_installed')
        }
      }
    } else {
      mainWindow?.webContents.send('carThingState', 'not_found')
    }
  }

  async function interval() {
    await carThingStateUpdate()

    setTimeout(interval, 5000)
  }

  interval()

  ipcMain.handle(IPCHandler.TriggerCarThingStateUpdate, async () => {
    await carThingStateUpdate()
  })

  ipcMain.handle(IPCHandler.UploadShortcutImage, async (_event, name) => {
    return await uploadShortcutImage(name)
  })

  ipcMain.handle(IPCHandler.RemoveNewShortcutImage, async () => {
    return removeShortcutImage('new')
  })

  ipcMain.handle(IPCHandler.GetShortcuts, async () => {
    return getShortcuts()
  })

  ipcMain.handle(IPCHandler.AddShortcut, async (_event, shortcut) => {
    addShortcut(shortcut)
    await updateApps()
  })

  ipcMain.handle(IPCHandler.RemoveShortcut, async (_event, shortcut) => {
    removeShortcut(shortcut)
    await updateApps()
  })

  ipcMain.handle(IPCHandler.UpdateShortcut, async (_event, shortcut) => {
    updateShortcut(shortcut)
    await updateApps()
  })

  ipcMain.handle(IPCHandler.IsDevMode, async () => {
    return isDev()
  })

  ipcMain.handle(IPCHandler.GetBrightness, async () => {
    return await getBrightness(null)
  })

  ipcMain.handle(IPCHandler.SetBrightness, async (_event, value) => {
    return await setBrightnessSmooth(null, value)
  })

  ipcMain.handle(IPCHandler.GetPatches, async () => {
    return await getPatches()
  })

  ipcMain.handle(IPCHandler.ApplyPatch, async (_event, patch) => {
    return await applyPatch(patch)
  })

  ipcMain.handle(
    IPCHandler.ValidateConfig,
    async (_event, handlerName, config) => {
      const valid = playbackManager.validateConfig(handlerName, config)
      return valid
    }
  )

  ipcMain.handle(
    IPCHandler.GetPlaybackHandlerConfig,
    (_event, handlerName) => {
      return getPlaybackHandlerConfig(handlerName)
    }
  )

  ipcMain.handle(
    IPCHandler.SetPlaybackHandlerConfig,
    (_event, handlerName, config) => {
      return setPlaybackHandlerConfig(handlerName, config)
    }
  )

  ipcMain.handle(IPCHandler.RestartPlaybackHandler, async () => {
    const playbackHandler = getStorageValue('playbackHandler')
    if (!playbackHandler) return

    playbackManager.setup(playbackHandler)
  })

  ipcMain.handle(IPCHandler.HasCustomClient, async () => {
    return hasCustomWebApp()
  })

  ipcMain.handle(IPCHandler.ImportCustomClient, async () => {
    const res = await importCustomWebApp()
    if (!res) return false
    await installApp(null)
    return true
  })

  ipcMain.handle(IPCHandler.RemoveCustomClient, async () => {
    await removeCustomWebApp()
    await installApp(null)
    return true
  })

  ipcMain.handle(IPCHandler.GetLogs, async () => {
    return getLogs()
  })

  ipcMain.handle(IPCHandler.ClearLogs, async () => {
    return clearLogs()
  })

  ipcMain.handle(IPCHandler.DownloadLogs, async () => {
    await downloadLogs()
  })

  ipcMain.handle(IPCHandler.UploadScreensaverImage, async () => {
    return await uploadScreensaverImage()
  })

  ipcMain.handle(IPCHandler.RemoveScreensaverImage, async () => {
    return removeScreensaverImage()
  })

  ipcMain.handle(IPCHandler.HasCustomScreensaverImage, async () => {
    return hasCustomScreensaverImage()
  })

  ipcMain.handle(IPCHandler.UpdateWeather, async () => {
    return await updateWeather()
  })
}

async function setupTray() {
  const icon =
    os.platform() === 'darwin'
      ? nativeImage
          .createFromPath(trayIcon)
          .resize({ height: 24, width: 24 })
      : trayIcon
  const tray = new Tray(icon)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: `GlanceThing v${app.getVersion()}`,
      enabled: false
    },
    {
      type: 'separator'
    },
    {
      label: 'Show',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
        } else {
          createWindow()
        }
      }
    },
    {
      label: 'Quit',
      click: () => {
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)

  tray.setToolTip(`GlanceThing v${app.getVersion()}`)

  tray.on('click', () => {
    if (os.platform() === 'darwin') return
    if (mainWindow) {
      mainWindow.show()
    } else {
      createWindow()
    }
  })
}
