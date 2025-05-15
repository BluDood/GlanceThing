import { RepeatMode } from '../../types/Playback.js'
import {
  HandlerAction,
  HandlerFunction
} from '../../types/WebSocketHandler.js'
import { playbackManager } from '../playback/playback.js'

export const name = 'playback'

export const hasActions = true

export const actions: HandlerAction[] = [
  {
    action: 'pause',
    handle: async () => {
      await playbackManager.pause()
    }
  },
  {
    action: 'play',
    handle: async () => {
      await playbackManager.play()
    }
  },
  {
    action: 'volume',
    handle: async (_ws, data) => {
      await playbackManager.setVolume((data as { volume: number }).volume)
    }
  },
  {
    action: 'image',
    handle: async ws => {
      const image = await playbackManager.getImage()
      if (!image) return
      ws.send(
        JSON.stringify({
          type: 'playback',
          action: 'image',
          data: image.toString('base64')
        })
      )
    }
  },
  {
    action: 'previous',
    handle: async () => {
      await playbackManager.previous()
    }
  },
  {
    action: 'next',
    handle: async () => {
      await playbackManager.next()
    }
  },
  {
    action: 'shuffle',
    handle: async (_, data) => {
      await playbackManager.shuffle((data as { state: boolean }).state)
    }
  },
  {
    action: 'repeat',
    handle: async (_, data) => {
      await playbackManager.repeat((data as { state: RepeatMode }).state)
    }
  },
  {
    action: 'lyrics',
    handle: async ws => {
      const lyrics = await playbackManager.getLyrics()
      if (!lyrics) return
      ws.send(
        JSON.stringify({
          type: 'playback',
          action: 'lyrics',
          data: lyrics
        })
      )
    }
  }
]

export const handle: HandlerFunction = async ws => {
  const res = await playbackManager.getPlayback()
  ws.send(
    JSON.stringify({
      type: 'playback',
      data: res
    })
  )
}