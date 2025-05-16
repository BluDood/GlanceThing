import TypedEmitter from 'typed-emitter'
import EventEmitter from 'events'

import { BasePlaybackHandler } from './BasePlaybackHandler.js'

import spotify from './spotify.js'

import {
  PlaybackData,
  PlaybackHandlerEvents,
  RepeatMode,
  LyricsResponse
} from '../../types/Playback.js'
import { log } from '../utils.js'
import { getPlaybackHandlerConfig, setStorageValue } from '../storage.js'

const handlers: BasePlaybackHandler[] = [spotify]

class PlaybackManager extends (EventEmitter as new () => TypedEmitter<PlaybackHandlerEvents>) {
  private currentHandler: BasePlaybackHandler | null = null

  private getHandler(name: string): BasePlaybackHandler {
    const handler = handlers.find(handler => handler.name === name)
    if (!handler) throw new Error(`Handler ${name} not found`)

    return handler
  }

  async setup(handlerName: string) {
    if (this.currentHandler) await this.cleanup()
    if (handlerName === 'none') return
    log(`Setting up handler ${handlerName}...`, 'Playback')

    const handler = this.getHandler(handlerName)
    const config = await getPlaybackHandlerConfig(handlerName)
    if (!config) {
      this.emit('error', new Error('No config found for handler'))
      return setStorageValue('playbackHandler', 'none')
    }

    handler.on('playback', data => this.emit('playback', data))
    handler.on('open', () => this.emit('open', handlerName))
    handler.on('close', () => this.emit('close'))
    handler.on('error', error => this.emit('error', error))

    await handler.setup(config)

    this.emit('playback', await handler.getPlayback())

    this.currentHandler = handler
  }

  async validateConfig(
    handlerName: string,
    config: unknown
  ): Promise<boolean> {
    const handler = this.getHandler(handlerName)
    return handler.validateConfig(config)
  }

  async cleanup() {
    if (!this.currentHandler) return
    this.emit('playback', null)
    await this.currentHandler.cleanup()
    this.currentHandler = null
  }

  async getPlayback(): Promise<PlaybackData> {
    if (!this.currentHandler) return null
    return this.currentHandler.getPlayback()
  }

  async play(): Promise<void> {
    if (!this.currentHandler) return
    return this.currentHandler.play()
  }

  async pause(): Promise<void> {
    if (!this.currentHandler) return
    return this.currentHandler.pause()
  }

  async setVolume(volume: number): Promise<void> {
    if (!this.currentHandler) return
    return this.currentHandler.setVolume(volume)
  }

  async next(): Promise<void> {
    if (!this.currentHandler) return
    return this.currentHandler.next()
  }

  async previous(): Promise<void> {
    if (!this.currentHandler) return
    return this.currentHandler.previous()
  }

  async shuffle(state: boolean): Promise<void> {
    if (!this.currentHandler) return
    return this.currentHandler.shuffle(state)
  }

  async repeat(state: RepeatMode): Promise<void> {
    if (!this.currentHandler) return
    return this.currentHandler.repeat(state)
  }

  async getImage(): Promise<Buffer | null> {
    if (!this.currentHandler) return null
    return this.currentHandler.getImage()
  }

  async getLyrics(): Promise<LyricsResponse | null> {
    if (!this.currentHandler) return null
    return this.currentHandler.getLyrics()
  }
}

export const playbackManager = new PlaybackManager()
