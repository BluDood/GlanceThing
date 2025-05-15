import EventEmitter from 'events'
import TypedEmitter from 'typed-emitter'

import {
  PlaybackData,
  PlaybackHandlerEvents,
  RepeatMode,
  LyricsResponse
} from '../../types/Playback.js'

export abstract class BasePlaybackHandler extends (EventEmitter as new () => TypedEmitter<PlaybackHandlerEvents>) {
  abstract name: string
  abstract setup(config: unknown): Promise<void>
  abstract cleanup(): Promise<void>
  abstract validateConfig(config: unknown): Promise<boolean>

  abstract getPlayback(): Promise<PlaybackData>
  abstract play(): Promise<void>
  abstract pause(): Promise<void>
  abstract setVolume(volume: number): Promise<void>
  abstract next(): Promise<void>
  abstract previous(): Promise<void>
  abstract shuffle(state: boolean): Promise<void>
  abstract repeat(stae: RepeatMode): Promise<void>
  abstract getImage(): Promise<Buffer | null>
  abstract getLyrics(): Promise<LyricsResponse | null>
}