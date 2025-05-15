import axios, { AxiosInstance } from 'axios'
import { TOTP } from 'totp-generator'
import { WebSocket } from 'ws'

import { BasePlaybackHandler } from './BasePlaybackHandler.js'
import { log, LogLevel, intToRgb } from '../utils.js'

import { Action, PlaybackData, RepeatMode } from '../../types/Playback.js'
import { getStorageValue, setStorageValue } from '../storage.js'

async function subscribe(connection_id: string, token: string) {
  return await axios.put(
    'https://api.spotify.com/v1/me/notifications/player',
    null,
    {
      params: {
        connection_id
      },
      headers: {
        Authorization: `Bearer ${token}`
      },
      validateStatus: () => true
    }
  )
}

function base32FromBytes(bytes: Uint8Array, secretSauce: string): string {
  let t = 0
  let n = 0
  let r = ''

  for (let i = 0; i < bytes.length; i++) {
    n = (n << 8) | bytes[i]
    t += 8
    while (t >= 5) {
      r += secretSauce[(n >>> (t - 5)) & 31]
      t -= 5
    }
  }

  if (t > 0) {
    r += secretSauce[(n << (5 - t)) & 31]
  }

  return r
}

function cleanBuffer(e: string): Uint8Array {
  e = e.replace(' ', '')
  const buffer = new Uint8Array(e.length / 2)
  for (let i = 0; i < e.length; i += 2) {
    buffer[i / 2] = parseInt(e.substring(i, i + 2), 16)
  }
  return buffer
}

async function generateTotp(): Promise<{
  otp: string
  timestamp: number
}> {
  const secretSauce = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

  const secretCipherBytes = [
    12, 56, 76, 33, 88, 44, 88, 33, 78, 78, 11, 66, 22, 22, 55, 69, 54
  ].map((e, t) => e ^ ((t % 33) + 9))

  const secretBytes = cleanBuffer(
    new TextEncoder()
      .encode(secretCipherBytes.join(''))
      .reduce((acc, val) => acc + val.toString(16).padStart(2, '0'), '')
  )

  const secret = base32FromBytes(secretBytes, secretSauce)

  const res = await axios.get('https://open.spotify.com/server-time')
  const timestamp = res.data.serverTime * 1000

  const totp = TOTP.generate(secret, {
    timestamp
  })

  return {
    otp: totp.otp,
    timestamp
  }
}

export async function getWebToken(sp_dc: string) {
  const totp = await generateTotp()

  const res = await axios.get(
    'https://open.spotify.com/get_access_token',
    {
      headers: {
        cookie: `sp_dc=${sp_dc};`,
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      },
      params: {
        reason: 'init',
        productType: 'web-player',
        totp: totp.otp,
        totpVer: '5',
        ts: totp.timestamp
      },
      validateStatus: () => true
    }
  )

  if (res.status !== 200) throw new Error('Invalid sp_dc')

  if (!res.data.accessToken) throw new Error('Invalid sp_dc')

  return res.data.accessToken
}

export async function refreshAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
) {
  const res = await axios.post(
    'https://accounts.spotify.com/api/token',
    {},
    {
      params: {
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      },
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${clientId}:${clientSecret}`
        ).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      validateStatus: () => true
    }
  )

  if (res.status !== 200) return null

  return res.data.access_token
}

interface SpotifyTrackItem {
  id: string
  name: string
  external_urls: {
    spotify: string
  }
  artists: {
    name: string
    external_urls: {
      spotify: string
    }
  }[]
  album: {
    name: string
    href: string
    images: {
      url: string
      width: number
      height: number
    }[]
  }
  duration_ms: number
}

interface SpotifyEpisodeItem {
  id: string
  name: string
  external_urls: {
    spotify: string
  }
  images: {
    url: string
    width: number
    height: number
  }[]
  show: {
    name: string
    publisher: string
    external_urls: {
      spotify: string
    }
    href: string
    images: {
      url: string
      width: number
      height: number
    }[]
  }
  duration_ms: number
}

export interface SpotifyCurrentPlayingResponse {
  device: {
    id: string
    is_active: boolean
    is_private_session: boolean
    is_restricted: boolean
    name: string
    type: string
    volume_percent: number
    supports_volume: boolean
  }
  repeat_state: string
  shuffle_state: boolean
  context: {
    external_urls: {
      spotify: string
    }
    href: string
    type: string
    uri: string
  }
  timestamp: number
  progress_ms: number
  currently_playing_type: 'track' | 'episode'
  is_playing: boolean
  item: SpotifyTrackItem | SpotifyEpisodeItem
}

export interface LyricsResponse {
  lyrics?: {
    syncType: string
    lines: {
      startTimeMs: string
      endTimeMs: string
      words: string
      syllables?: {
        startTimeMs: string;
        endTimeMs: string;
        text: string;
      }[]
    }
  }
  colors?: {
    background: number
    text: number
    highlightText: number
  }
  hasVocalRemoval?: boolean
  message?: string
}

const defaultSupportedActions: Action[] = [
  'play',
  'pause',
  'next',
  'previous',
  'image'
]

export function filterData(
  data: SpotifyCurrentPlayingResponse
): PlaybackData | null {
  const {
    is_playing,
    item,
    progress_ms,
    currently_playing_type,
    device,
    repeat_state,
    shuffle_state
  } = data

  if (!item) {
    return null
  }

  const repeatStateMap: Record<string, RepeatMode> = {
    off: 'off',
    context: 'on',
    track: 'one'
  }

  if (currently_playing_type === 'episode') {
    const item = data.item as SpotifyEpisodeItem

    return {
      isPlaying: is_playing,
      repeat: repeatStateMap[repeat_state],
      shuffle: shuffle_state,
      volume: device.volume_percent,
      track: {
        album: item.show.name,
        artists: [item.show.publisher],
        duration: {
          current: progress_ms,
          total: item.duration_ms
        },
        name: item.name
      },
      supportedActions: [
        ...defaultSupportedActions,
        ...((device.supports_volume ? ['volume'] : []) as Action[])
      ]
    }
  } else if (currently_playing_type === 'track') {
    const item = data.item as SpotifyTrackItem

    return {
      isPlaying: is_playing,
      repeat: repeatStateMap[repeat_state],
      shuffle: shuffle_state,
      volume: device.volume_percent,
      track: {
        album: item.album.name,
        artists: item.artists.map(a => a.name),
        duration: {
          current: progress_ms,
          total: item.duration_ms
        },
        name: item.name
      },
      supportedActions: [
        ...defaultSupportedActions,
        'repeat',
        'shuffle',
        ...((device.supports_volume ? ['volume'] : []) as Action[])
      ]
    }
  } else {
    return null
  }
}

interface SpotifyConfig {
  sp_dc: string
  clientId: string
  clientSecret: string
  refreshToken: string
}

class SpotifyHandler extends BasePlaybackHandler {
  name: string = 'spotify'

  config: SpotifyConfig | null = null
  accessToken: string | null = null
  webToken: string | null = null
  ws: WebSocket | null = null
  instance: AxiosInstance | null = null

  lyricsCache: Map<string, { data: LyricsResponse, timestamp: number }> = new Map()
  lyricsCacheExpiration: number = 24 * 60 * 60 * 1000 // 24 hours
  cacheCleanupInterval: NodeJS.Timeout | null = null
  lyricsCacheStorageKey: string = 'spotify_lyrics_cache'

  async setup(config: SpotifyConfig): Promise<void> {
    log('Setting up', 'Spotify')

    this.config = config

    // Load lyrics cache from storage if available
    this.loadLyricsCache()

    this.instance = axios.create({
      baseURL: 'https://api.spotify.com/v1',
      validateStatus: () => true
    })

    this.instance.interceptors.request.use(config => {
      config.headers.Authorization = `Bearer ${this.accessToken}`
      return config
    })

    this.instance.interceptors.response.use(async res => {
      if (res.status === 401) {
        log('Refreshing token...', 'Spotify')
        this.accessToken = await refreshAccessToken(
          this.config!.clientId,
          this.config!.clientSecret,
          this.config!.refreshToken
        ).catch(err => {
          this.emit('error', err)
          return null
        })

        if (!this.accessToken) return res
        return this.instance!(res.config)
      }

      return res
    })

    if (this.config!.sp_dc) {
      this.webToken = await getWebToken(this.config!.sp_dc).catch(err => {
        log(`Error getting webToken: ${err}`, 'Spotify', LogLevel.WARN)
        return null
      })
    }

    this.accessToken = await refreshAccessToken(
      this.config!.clientId,
      this.config!.clientSecret,
      this.config!.refreshToken
    ).catch(err => {
      this.emit('error', err)
      return null
    })

    if (this.webToken) {
      this.ws = new WebSocket(
        `wss://dealer.spotify.com/?access_token=${this.webToken}`
      )
      await this.start()
    } else {
      this.emit('open', this.name)
    }

    this.cacheCleanupInterval = setInterval(() => {
      this.cleanLyricsCache()
      this.saveLyricsCache()
    }, 60 * 60 * 1000)
  }

  async start() {
    if (!this.ws) return
    const ping = () => this.ws!.send('{"type":"ping"}')

    this.ws.on('open', () => {
      ping()
      const interval = setInterval(() => {
        if (!this.ws) return clearInterval(interval)
        ping()
      }, 15000)
    })

    this.ws.on('message', async d => {
      const msg = JSON.parse(d.toString())
      if (msg.headers?.['Spotify-Connection-Id']) {
        await subscribe(
          msg.headers['Spotify-Connection-Id'],
          this.webToken!
        )
          .then(() => this.emit('open', this.name))
          .catch(err => this.emit('error', err))

        return
      }
      const event = msg.payloads?.[0]?.events?.[0]
      if (!event) return

      if (event.type === 'PLAYER_STATE_CHANGED') {
        const state = event.event.state

        if (state.currently_playing_type === 'track') {
          this.emit('playback', filterData(state))
        } else if (state.currently_playing_type === 'episode') {
          const current = await this.getCurrent()
          if (!current) return

          this.emit('playback', filterData(current))
        }
      } else if (event.type === 'DEVICE_STATE_CHANGED') {
        const devices = event.event.devices
        if (devices.some(d => d.is_active)) return
        this.emit('playback', null)
      }
    })

    this.ws.on('close', () => this.emit('close'))

    this.ws.on('error', err => this.emit('error', err))
  }

  async cleanup(): Promise<void> {
    log('Cleaning up', 'Spotify')

    this.saveLyricsCache()
    this.lyricsCache.clear()

    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval)
      this.cacheCleanupInterval = null
    }

    if (!this.ws) return
    this.ws.removeAllListeners()
    this.ws.close()
    this.ws = null
    this.removeAllListeners()
  }

  cleanLyricsCache(): void {
    const now = Date.now()
    let expiredCount = 0;

    for (const [trackId, entry] of this.lyricsCache.entries()) {
      if (now - entry.timestamp > this.lyricsCacheExpiration) {
        this.lyricsCache.delete(trackId)
        expiredCount++;
      }
    }

    log(`Cleaned lyrics cache. Removed ${expiredCount} expired entries. Current size: ${this.lyricsCache.size} entries`, 'Spotify', LogLevel.DEBUG)
  }

  saveLyricsCache(): void {
    try {
      const cacheEntries = Array.from(this.lyricsCache.entries())
      setStorageValue(this.lyricsCacheStorageKey, cacheEntries)
      log(`Saved lyrics cache with ${cacheEntries.length} entries`, 'Spotify', LogLevel.DEBUG)
    } catch (error) {
      log(`Error saving lyrics cache: ${error}`, 'Spotify', LogLevel.ERROR)
    }
  }

  loadLyricsCache(): void {
    try {
      const cachedData = getStorageValue(this.lyricsCacheStorageKey)
      if (cachedData && Array.isArray(cachedData)) {
        this.lyricsCache = new Map(cachedData)
        log(`Loaded lyrics cache with ${this.lyricsCache.size} entries`, 'Spotify', LogLevel.DEBUG)
        this.cleanLyricsCache()
      } else {
        log(`No lyrics cache found or invalid format`, 'Spotify', LogLevel.DEBUG)
      }
    } catch (error) {
      log(`Error loading lyrics cache: ${error}`, 'Spotify', LogLevel.ERROR)
      this.lyricsCache = new Map()
    }
  }

  getLyricsCacheStats(): { size: number, avgAge: number } {
    const now = Date.now()
    let totalAge = 0

    for (const entry of this.lyricsCache.values()) {
      totalAge += now - entry.timestamp
    }

    const size = this.lyricsCache.size
    const avgAge = size > 0 ? totalAge / size / 1000 : 0

    return { size, avgAge }
  }

  async validateConfig(config: unknown): Promise<boolean> {
    const { sp_dc, clientId, clientSecret, refreshToken } =
      config as SpotifyConfig

    if (clientId && clientSecret && refreshToken && !sp_dc) {
      const token = await refreshAccessToken(
        clientId,
        clientSecret,
        refreshToken
      ).catch(() => null)
      if (!token) return false
      return true
    } else if (sp_dc && !clientId && !clientSecret) {
      const token = await getWebToken(sp_dc).catch(() => null)
      if (!token) return false

      return true
    }

    return false
  }

  async getCurrent(): Promise<SpotifyCurrentPlayingResponse | null> {
    const res = await this.instance!.get('/me/player', {
      params: {
        additional_types: 'episode'
      }
    })

    if (!res.data || res.status !== 200) return null

    return res.data
  }

  async getPlayback(): Promise<PlaybackData> {
    const current = await this.getCurrent()
    if (!current) return null

    return filterData(current)
  }

  async play(): Promise<void> {
    await this.instance!.put('/me/player/play')
  }

  async pause(): Promise<void> {
    await this.instance!.put('/me/player/pause')
  }

  async setVolume(volume: number): Promise<void> {
    await this.instance!.put('/me/player/volume', null, {
      params: {
        volume_percent: volume
      }
    })
  }

  async next(): Promise<void> {
    await this.instance!.post('/me/player/next')
  }

  async previous(): Promise<void> {
    await this.instance!.post('/me/player/previous')
  }

  async shuffle(state: boolean): Promise<void> {
    await this.instance!.put('/me/player/shuffle', null, {
      params: {
        state
      }
    })
  }

  async repeat(state: RepeatMode): Promise<void> {
    const map: Record<RepeatMode, string> = {
      off: 'off',
      on: 'context',
      one: 'track'
    }

    await this.instance!.put('/me/player/repeat', null, {
      params: {
        state: map[state]
      }
    })
  }

  async getImage(): Promise<Buffer | null> {
    const current = await this.getCurrent()
    if (!current) return null

    if (current.currently_playing_type === 'episode') {
      const item = current.item as SpotifyEpisodeItem
      const imageRes = await axios.get(item.images[0].url, {
        responseType: 'arraybuffer'
      })

      return imageRes.data
    } else if (current.currently_playing_type === 'track') {
      const item = current.item as SpotifyTrackItem
      const imageRes = await axios.get(item.album.images[1].url, {
        responseType: 'arraybuffer'
      })

      return imageRes.data
    } else {
      return null
    }
  }

  async getLyrics(): Promise<LyricsResponse | null> {
    const current = await this.getCurrent()
    if (!current) return null
    if (current.currently_playing_type === 'episode') {
      return { message: 'No lyrics for podcast' }
    }

    const item = current.item as SpotifyTrackItem
    const trackId = item.id
    const now = Date.now()
    try {
      const cachedLyrics = this.lyricsCache.get(trackId)

      if (cachedLyrics && (now - cachedLyrics.timestamp < this.lyricsCacheExpiration)) {
        log(`Using cached lyrics for track: ${trackId}`, 'Spotify', LogLevel.DEBUG)
        return cachedLyrics.data
      }

      log(`Fetching lyrics for track: ${trackId}`, 'Spotify')
      let url = `https://spclient.wg.spotify.com/color-lyrics/v2/track/${trackId}`

      if (item.album.images[0]?.url) {
        url += `/image/${encodeURIComponent(item.album.images[0].url)}`
      }

      url += '?format=json&vocalRemoval=false&market=from_token'
      log(`${url}`, 'Spotify', LogLevel.DEBUG)

      const fetchLyrics = async (): Promise<any> => {
        return await axios.get(url, {
          headers: {
            'authorization': `Bearer ${this.webToken}`,
            'app-platform': 'WebPlayer'
          },
          validateStatus: () => true
        })
      }

      let res = await fetchLyrics()

      if (res.status === 401 && this.config?.sp_dc) {
        log('Received 401 error, refreshing webToken and retrying', 'Spotify', LogLevel.WARN)
        try {
          this.webToken = await getWebToken(this.config.sp_dc)
          log('Successfully refreshed webToken', 'Spotify', LogLevel.DEBUG)
          res = await fetchLyrics()
        } catch (refreshError) {
          log(`Failed to refresh webToken: ${refreshError}`, 'Spotify', LogLevel.ERROR)
          throw new Error(`Failed to refresh webToken: ${refreshError}`)
        }
      }

      if (res.status !== 200) {
        throw new Error(`Failed to fetch lyrics: ${res.status}`)
      }
      if (res.data.colors) {
        intToRgb(res.data.colors?.background ?? 0)
        res.data.colors = {
          background: intToRgb(res.data.colors?.background) ?? 0,
          text: intToRgb(res.data.colors?.text) ?? 0,
          highlightText: intToRgb(res.data.colors?.highlightText) ?? 0
        }
      }
      this.lyricsCache.set(trackId, { data: res.data, timestamp: now })
      this.saveLyricsCache()
      return res.data
    } catch (error) {
      log(`Error fetching lyrics: ${error}`, 'Spotify', LogLevel.ERROR)
      const noLyricsMsg = 'No lyrics for this track'
      this.lyricsCache.set(trackId, { data: { message: noLyricsMsg }, timestamp: now })
      this.saveLyricsCache()
      return this.lyricsCache.get(trackId)?.data ?? null
    }
  }
}

export default new SpotifyHandler()