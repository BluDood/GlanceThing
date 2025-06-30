import { app, dialog } from 'electron'
import path from 'path'
import fs from 'fs'
import { wss } from './server.js'
import { AuthenticatedWebSocket } from '../types/WebSocketServer.js'

export async function uploadScreensaverImage() {
  const res = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Image Files', extensions: ['png', 'jpg', 'jpeg', 'webp'] }
    ]
  })

  if (res.canceled) return { success: false }

  const imagePath = res.filePaths[0]

  try {
    const stats = fs.statSync(imagePath)
    const fileSizeInBytes = stats.size
    const fileSizeInMB = fileSizeInBytes / (1024 * 1024)

    if (fileSizeInMB > 5) {
      return {
        success: false,
        error: 'size_limit_exceeded',
        message:
          'Image size exceeds the 5MB limit. Please select a smaller image.'
      }
    }
  } catch (error) {
    return {
      success: false,
      error: 'file_read_error',
      message: 'Could not read the selected file.'
    }
  }

  try {
    const userData = app.getPath('userData')
    const imageFolder = path.join(userData, 'screensaver')
    const target = path.join(imageFolder, 'image.png')

    if (!fs.existsSync(imageFolder)) {
      fs.mkdirSync(imageFolder, { recursive: true })
    }

    fs.copyFileSync(imagePath, target)

    updateScreensaverImage()

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: 'save_error',
      message: 'Could not save the image file.'
    }
  }
}

export function removeScreensaverImage() {
  const userData = app.getPath('userData')
  const imageFolder = path.join(userData, 'screensaver')
  const target = path.join(imageFolder, 'image.png')

  if (fs.existsSync(target)) {
    fs.unlinkSync(target)
  }

  if (wss) {
    wss.clients.forEach(async (ws: AuthenticatedWebSocket) => {
      if (!ws.authenticated && ws.readyState !== WebSocket.OPEN) return

      ws.send(
        JSON.stringify({
          type: 'screensaver',
          action: 'removed'
        })
      )
    })
  }

  return true
}

export function getScreensaverImagePath() {
  const userData = app.getPath('userData')
  const imageFolder = path.join(userData, 'screensaver')
  const target = path.join(imageFolder, 'image.png')

  if (!fs.existsSync(target)) return null

  return target
}

export function hasCustomScreensaverImage() {
  return getScreensaverImagePath() !== null
}

export function updateScreensaverImage() {
  if (!wss) return

  wss.clients.forEach(async (ws: AuthenticatedWebSocket) => {
    if (!ws.authenticated && ws.readyState !== WebSocket.OPEN) return

    ws.send(
      JSON.stringify({
        type: 'screensaver',
        action: 'update'
      })
    )
  })
}
