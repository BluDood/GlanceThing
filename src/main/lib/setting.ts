
import { AuthenticatedWebSocket } from '../types/WebSocketServer.js'
import { wss } from './server.js'
import { getStorageValue } from './storage.js'

export function getClientSettings() {
  const clientKeys = [
    'showStatusBar',
    'showTimeWidget',
    'showWeatherWidget',
    'showAppsWidget',
    'showControlsWidget',
    'showLyricsWidget',
    'showNothingPlayingNote',
    'showTimeOnScreensaver',
    'screensaverTimePosition',
    'showTempUnit',
    'autoSwitchToLyrics',
    'showTimeInStatusBar',
    'showWeatherInStatusBar',
  ];
  const clientSettings = {};
  clientKeys.forEach(key => {
    let value = getStorageValue(key);
    if (value === null) {
      value = true
    }
    clientSettings[key] = value
  });
  return clientSettings
}

export async function notifyClientsOfSettingChanges(): Promise<void> {
  if (!wss) return

  wss.clients.forEach(async (ws: AuthenticatedWebSocket) => {
    if (!ws.authenticated) return
    if (ws.readyState === 1) {
      ws.send(
        JSON.stringify({
          type: 'setting',
          data: getClientSettings()
        })
      )
    }
  })
}