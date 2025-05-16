import '@electron-toolkit/preload'

interface Shortcut {
  id: string
  command: string
}

declare global {
  interface Window {
    api: {
      on: (
        channel: string,
        listener: (...args: unknown[]) => void
      ) => () => void
      findCarThing: () => Promise<string | boolean>
      findSetupCarThing: () => Promise<
        'not_found' | 'not_installed' | 'ready'
      >
      rebootCarThing: () => Promise<void>
      installApp: () => Promise<string | true>
      startServer: () => Promise<void>
      stopServer: () => Promise<void>
      isServerStarted: () => Promise<boolean>
      forwardSocketServer: () => Promise<void>
      getVersion: () => Promise<string>
      getStorageValue: (key: string) => Promise<unknown>
      setStorageValue: (key: string, value: unknown) => Promise
      triggerCarThingStateUpdate: () => void
      uploadShortcutImage: (name: string) => Promise<string>
      removeNewShortcutImage: () => Promise<void>
      getShortcuts: () => Promise<Shortcut[]>
      addShortcut: (shortcut: Shortcut) => Promise<void>
      removeShortcut: (id: string) => Promise<void>
      updateShortcut: (shortcut: Shortcut) => Promise<void>
      isDevMode: () => Promise<boolean>
      getBrightness: () => Promise<number>
      setBrightness: (brightness: number) => Promise<void>
      getPatches: () => Promise<
        { name: string; description: string; installed: boolean }[]
      >
      applyPatch: (patchName: string) => Promise<void>
      validateConfig: (
        handlerName: string,
        config: unknown
      ) => Promise<boolean>
      getPlaybackHandlerConfig: (handlerName: string) => Promise<unknown>
      setPlaybackHandlerConfig: (
        handlerName: string,
        config: unknown
      ) => Promise<void>
      restartPlaybackHandler: () => Promise<void>
      hasCustomClient: () => Promise<boolean>
      importCustomClient: () => Promise<void>
      removeCustomClient: () => Promise<void>
      getLogs: () => Promise<string[]>
      clearLogs: () => Promise<void>
      downloadLogs: () => Promise<void>
      uploadScreensaverImage: () => Promise<{
        success: boolean
        error?: string
        message?: string
      }>
      removeScreensaverImage: () => Promise<boolean>
      hasCustomScreensaverImage: () => Promise<boolean>
      updateWeather: () => Promise<boolean>
    }
  }
}
