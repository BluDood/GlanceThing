import { BasePlaybackHandler } from './BasePlaybackHandler.js'
import { log } from '../utils.js'

import { PlaybackData, RepeatMode } from '../../types/Playback.js'
import { createRequire } from 'node:module'
import axios from 'axios'

declare class NowPlaying {
  constructor(
    callback: (event: NowPlayingMessage) => void,
    options?: NowPlayingOptions
  )
  subscribe(): Promise<void>
  unsubscribe(): Promise<void>
  sendCommand(command: PlayerCommand): Promise<void>
  play(to?: string | undefined | null): Promise<void>
  pause(to?: string | undefined | null): Promise<void>
  playPause(to?: string | undefined | null): Promise<void>
  nextTrack(to?: string | undefined | null): Promise<void>
  previousTrack(to?: string | undefined | null): Promise<void>
  seekTo(positionMs: number, to?: string | undefined | null): Promise<void>
  setVolume(volume: number, to?: string | undefined | null): Promise<void>
  setShuffle(
    shuffle: boolean,
    to?: string | undefined | null
  ): Promise<void>
}

interface LogMessage {
  /** log level (TRACE, DEBUG, INFO, WARN, ERROR) */
  level: string
  /** log target */
  target: string
  /** log message */
  message: string
  /** timestamp in ISO 8601 format */
  timestamp: string
}

/** now playing info */
interface NowPlayingMessage {
  album?: string
  artist?: Array<string>
  playlist?: string
  playlistId?: string
  trackName: string
  shuffleState?: boolean
  /** "off", "all", "track" */
  repeatState?: string
  isPlaying: boolean
  canFastForward: boolean
  canSkip: boolean
  canLike: boolean
  canChangeVolume: boolean
  canSetOutput: boolean
  trackDuration?: number
  trackProgress?: number
  /** 1.0 = normal speed, 0.5 = half speed, 2.0 = double speed */
  playbackRate?: number
  /** percentage 0-100 */
  volume: number
  /** Name of device that is playing the audio */
  device?: string
  /** A way to identify the current song (if possible - doesn't work on macos) */
  id?: string
  /** a way to identify the current device if needed */
  deviceId?: string
  /** the url of the current song */
  url?: string
  /** either a path on disk or a base64 encoding that includes data:image/png;base64, at the beginning */
  thumbnail?: string
}

interface NowPlayingOptions {
  logLevelDirective?: string
  logCallback?: (event: LogMessage) => void
}

/** Command to send to the player */
interface PlayerCommand {
  /**
   * the id of the device to send the command to
   *
   * if None, the command is sent to all devices; ignored on macos
   */
  to?: string
  data: PlayerCommandData
}

type PlayerCommandData =
  | { type: 'Play' }
  | { type: 'Pause' }
  | { type: 'PlayPause' }
  | { type: 'NextTrack' }
  | { type: 'PreviousTrack' }
  | { type: 'SeekTo'; positionMs: number }
  | { type: 'SetVolume'; volume: number }
  | { type: 'SetShuffle'; shuffle: boolean }

function importAddon() {
  const require = createRequire(import.meta.url)

  if (process.platform === 'win32') {
    if (process.arch === 'x64') {
      try {
        return require('node-nowplaying-win32-x64-msvc')
      } catch {
        log('Failed to import native addon', 'Native')
        return null
      }
    }
  } else if (process.platform === 'darwin') {
    try {
      return require('node-nowplaying-darwin-universal')
    } catch {
      log('Failed to import native addon', 'Native')
      return null
    }
  } else if (process.platform === 'linux') {
    if (process.arch === 'x64') {
      try {
        return require('node-nowplaying-linux-x64-gnu')
      } catch {
        log('Failed to import native addon', 'Native')
        return null
      }
    }
  }

  log('No native addon available for this platform', 'Native')
  return null
}

export function filterData(data: NowPlayingMessage): PlaybackData | null {
  const {
    isPlaying,
    volume,
    shuffleState,
    repeatState,
    trackName,
    artist,
    album,
    trackDuration,
    trackProgress,
    canChangeVolume,
    canSkip
  } = data

  if (!trackName) {
    return null
  }

  const repeatStateMap: Record<string, RepeatMode> = {
    off: 'off',
    all: 'on',
    track: 'one'
  }

  const playbackData: PlaybackData = {
    isPlaying,
    volume,
    shuffle: shuffleState ?? false,
    repeat: repeatStateMap[repeatState ?? 'off'],
    track: {
      name: trackName,
      artists: artist ?? [],
      album: album ?? '',
      duration: {
        current: (trackProgress ?? 0) / 10000,
        total: (trackDuration ?? 0) / 10000
      }
    },
    supportedActions: ['play', 'pause']
  }

  if (canChangeVolume) playbackData.supportedActions.push('volume')
  if (canSkip) playbackData.supportedActions.push('next', 'previous')
  if (data.thumbnail) playbackData.supportedActions.push('image')

  return playbackData
}

class NativeHandler extends BasePlaybackHandler {
  name: string = 'native'
  requiresInternet: boolean = false

  instance: NowPlaying | null = null
  current: NowPlayingMessage | null = null

  async setup(): Promise<void> {
    log('Setting up', 'Native')

    const addon = importAddon()
    if (!addon) return

    const instance = new addon.NowPlaying(
      async (event: NowPlayingMessage) => {
        const data = filterData(event)
        if (data) {
          this.current = event
          this.emit('playback', data)
        }
      }
    ) as NowPlaying

    await instance.subscribe()

    this.instance = instance
  }

  async cleanup(): Promise<void> {
    log('Cleaning up', 'Native')

    this.instance?.unsubscribe()
    this.instance = null
    this.removeAllListeners()
  }

  async validateConfig(): Promise<boolean> {
    return true
  }

  async getPlayback(): Promise<PlaybackData> {
    if (!this.current) return null
    return filterData(this.current)
  }

  async play(): Promise<void> {
    if (!this.instance) return

    await this.instance.play()
  }

  async pause(): Promise<void> {
    if (!this.instance) return

    await this.instance.pause()
  }

  async setVolume(volume: number): Promise<void> {
    if (!this.instance) return

    await this.instance.setVolume(volume)
  }

  async next(): Promise<void> {
    if (!this.instance) return

    await this.instance.nextTrack()
  }

  async previous(): Promise<void> {
    if (!this.instance) return

    await this.instance.previousTrack()
  }

  async shuffle(): Promise<void> {
    throw new Error('Not implemented')
  }

  async repeat(): Promise<void> {
    throw new Error('Not implemented')
  }

  async getImage(): Promise<Buffer | null> {
    const thumb = this.current?.thumbnail
    if (!thumb) return null

    if (thumb.startsWith('data:image')) {
      const base64 = thumb.replace(/^data:image\/\w+;base64,/, '')
      const buffer = Buffer.from(base64, 'base64')
      return buffer
    } else if (
      thumb.startsWith('https://') ||
      thumb.startsWith('http://')
    ) {
      const res = await axios.get(thumb, {
        responseType: 'arraybuffer'
      })

      return res.data
    } else return null
  }
}

export default new NativeHandler()
