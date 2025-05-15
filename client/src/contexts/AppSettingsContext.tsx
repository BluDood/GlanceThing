import React, { createContext, useContext, useEffect, useState } from 'react'
import { SocketContext } from './SocketContext.tsx'

interface AppSettings {
  showStatusBar: boolean
  showTimeWidget: boolean
  showWeatherWidget: boolean
  showAppsWidget: boolean
  showControlsWidget: boolean
  showLyricsWidget: boolean
  showNothingPlayingNote: boolean
  showTimeOnScreensaver: boolean
  screensaverTimePosition: string
  showTempUnit: boolean
  autoSwitchToLyrics: boolean
  showTimeInStatusBar: boolean
  showWeatherInStatusBar: boolean
}

interface AppSettingsContextProps extends AppSettings {
  setSettings: (settings: Partial<AppSettings>) => void
}

const defaultSettings: AppSettings = {
  showStatusBar: true,
  showTimeWidget: true,
  showWeatherWidget: true,
  showAppsWidget: true,
  showControlsWidget: true,
  showLyricsWidget: true,
  showNothingPlayingNote: true,
  showTimeOnScreensaver: true,
  screensaverTimePosition: 'bottom-right',
  showTempUnit: true,
  autoSwitchToLyrics: false,
  showTimeInStatusBar: true,
  showWeatherInStatusBar: true
}

const AppSettingsContext = createContext<AppSettingsContextProps>({
  ...defaultSettings,
  setSettings: () => { }
})

interface AppSettingsContextProviderProps {
  children: React.ReactNode
}

const AppSettingsContextProvider = ({
  children
}: AppSettingsContextProviderProps) => {
  const { ready, socket } = useContext(SocketContext)
  const [settings, setSettingsState] = useState<AppSettings>(defaultSettings)

  const setSettings = (newSettings: Partial<AppSettings>) => {
    setSettingsState(prev => ({
      ...prev,
      ...newSettings
    }))

    if (socket?.readyState === 1) {
      socket.send(JSON.stringify({
        type: 'setting',
        data: newSettings
      }))
    }
  }

  useEffect(() => {
    if (ready === true && socket) {
      const listener = (e: MessageEvent) => {
        try {
          const { type, data } = JSON.parse(e.data)
          if (type !== 'setting') return;

          if (data) {
            setSettingsState(prev => ({
              ...prev,
              ...data
            }))
            return
          }
        } catch (error) {
          console.error('Error parsing storage message:', error)
        }
      }

      socket.addEventListener('message', listener)
      socket.send(JSON.stringify({ type: 'setting' }))
      return () => {
        socket.removeEventListener('message', listener)
      }
    }
  }, [ready, socket])

  return (
    <AppSettingsContext.Provider
      value={{
        ...settings,
        setSettings
      }}
    >
      {children}
    </AppSettingsContext.Provider>
  )
}

export { AppSettingsContext, AppSettingsContextProvider }
