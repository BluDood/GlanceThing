import '@electron-toolkit/preload'

import { contextBridge, ipcRenderer } from 'electron'

interface Shortcut {
  id: string
  command: string
}

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

// Custom APIs for renderer
const api = {
  on: (channel: string, listener: (...args: unknown[]) => void) => {
    const _listener = (_event, ...args: unknown[]) => listener(...args)
    ipcRenderer.on(channel, _listener)

    return () => ipcRenderer.removeListener(channel, _listener)
  },
  findCarThing: () => ipcRenderer.invoke(IPCHandler.FindCarThing),
  findSetupCarThing: () =>
    ipcRenderer.invoke(IPCHandler.FindSetupCarThing),
  rebootCarThing: () => ipcRenderer.invoke(IPCHandler.RebootCarThing),
  installApp: () => ipcRenderer.invoke(IPCHandler.InstallApp),
  startServer: () => ipcRenderer.invoke(IPCHandler.StartServer),
  stopServer: () => ipcRenderer.invoke(IPCHandler.StopServer),
  isServerStarted: () => ipcRenderer.invoke(IPCHandler.IsServerStarted),
  forwardSocketServer: () =>
    ipcRenderer.invoke(IPCHandler.ForwardSocketServer),
  getVersion: () => ipcRenderer.invoke(IPCHandler.GetVersion),
  getStorageValue: (key: string) =>
    ipcRenderer.invoke(IPCHandler.GetStorageValue, key),
  setStorageValue: (key: string, value: unknown) =>
    ipcRenderer.invoke(IPCHandler.SetStorageValue, key, value),
  triggerCarThingStateUpdate: () =>
    ipcRenderer.invoke(IPCHandler.TriggerCarThingStateUpdate),
  uploadShortcutImage: (name: string) =>
    ipcRenderer.invoke(IPCHandler.UploadShortcutImage, name),
  removeNewShortcutImage: () =>
    ipcRenderer.invoke(IPCHandler.RemoveNewShortcutImage),
  getShortcuts: () => ipcRenderer.invoke(IPCHandler.GetShortcuts),
  addShortcut: (shortcut: Shortcut) =>
    ipcRenderer.invoke(IPCHandler.AddShortcut, shortcut),
  removeShortcut: (shortcut: Shortcut) =>
    ipcRenderer.invoke(IPCHandler.RemoveShortcut, shortcut),
  updateShortcut: (shortcut: Shortcut) =>
    ipcRenderer.invoke(IPCHandler.UpdateShortcut, shortcut),
  isDevMode: () => ipcRenderer.invoke(IPCHandler.IsDevMode),
  getBrightness: () => ipcRenderer.invoke(IPCHandler.GetBrightness),
  setBrightness: (brightness: number) =>
    ipcRenderer.invoke(IPCHandler.SetBrightness, brightness),
  getPatches: () => ipcRenderer.invoke(IPCHandler.GetPatches),
  applyPatch: (patchName: string) =>
    ipcRenderer.invoke(IPCHandler.ApplyPatch, patchName),
  validateConfig: (handlerName: string, config: unknown) =>
    ipcRenderer.invoke(IPCHandler.ValidateConfig, handlerName, config),
  getPlaybackHandlerConfig: (handlerName: string) =>
    ipcRenderer.invoke(IPCHandler.GetPlaybackHandlerConfig, handlerName),
  setPlaybackHandlerConfig: (handlerName: string, config: unknown) =>
    ipcRenderer.invoke(
      IPCHandler.SetPlaybackHandlerConfig,
      handlerName,
      config
    ),
  restartPlaybackHandler: () =>
    ipcRenderer.invoke(IPCHandler.RestartPlaybackHandler),
  hasCustomClient: () => ipcRenderer.invoke(IPCHandler.HasCustomClient),
  importCustomClient: () =>
    ipcRenderer.invoke(IPCHandler.ImportCustomClient),
  removeCustomClient: () =>
    ipcRenderer.invoke(IPCHandler.RemoveCustomClient),
  getLogs: () => ipcRenderer.invoke(IPCHandler.GetLogs),
  clearLogs: () => ipcRenderer.invoke(IPCHandler.ClearLogs),
  downloadLogs: () => ipcRenderer.invoke(IPCHandler.DownloadLogs),
  hasCustomScreensaverImage: () =>
    ipcRenderer.invoke(IPCHandler.HasCustomScreensaverImage),
  uploadScreensaverImage: () =>
    ipcRenderer.invoke(IPCHandler.UploadScreensaverImage),
  removeScreensaverImage: () =>
    ipcRenderer.invoke(IPCHandler.RemoveScreensaverImage),
  updateWeather: () => ipcRenderer.invoke(IPCHandler.UpdateWeather)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.api = api
}
