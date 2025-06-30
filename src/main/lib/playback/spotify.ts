import axios, { AxiosInstance } from 'axios'
import { TOTP } from 'totp-generator'
import { WebSocket } from 'ws'

import { BasePlaybackHandler } from './BasePlaybackHandler.js'
import { log } from '../utils.js'

import { Action, PlaybackData, RepeatMode } from '../../types/Playback.js'

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

async function generateTotp(): Promise<string> {
  const secretSauce = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

  const secretCipherBytes = [
    37, 84, 32, 76, 87, 90, 87, 47, 13, 75, 48, 54, 44, 28, 19, 21, 22
  ].map((e, t) => e ^ ((t % 33) + 9))

  const secretBytes = cleanBuffer(
    new TextEncoder()
      .encode(secretCipherBytes.join(''))
      .reduce((acc, val) => acc + val.toString(16).padStart(2, '0'), '')
  )

  const secret = base32FromBytes(secretBytes, secretSauce)

  const totp = TOTP.generate(secret)

  return totp.otp
}

export async function getWebToken(sp_dc: string) {
  const totp = await generateTotp()

  const res = await axios.get('https://open.spotify.com/api/token', {
    headers: {
      cookie: `sp_dc=${sp_dc};`,
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
    },
    params: {
      reason: 'init',
      productType: 'web-player',
      totp,
      totpVer: '8'
    },
    validateStatus: () => true
  })

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

  async setup(config: SpotifyConfig): Promise<void> {
    log('Setting up', 'Spotify')

    this.config = config

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

    this.webToken = await getWebToken(this.config!.sp_dc).catch(err => {
      this.emit('error', err)
      return null
    })

    this.accessToken = await refreshAccessToken(
      this.config!.clientId,
      this.config!.clientSecret,
      this.config!.refreshToken
    ).catch(err => {
      this.emit('error', err)
      return null
    })

    this.ws = new WebSocket(
      `wss://dealer.spotify.com/?access_token=${this.webToken}`
    )

    await this.start()
  }

  async start() {
    if (!this.ws) return
    const ping = () => this.ws!.send('{"type":"ping"}')

    this.ws.on('open', () => {
      ping()
      const interval = setInterval(() => {
        if (!this.ws || this.ws!.readyState !== WebSocket.OPEN)
          return clearInterval(interval)
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

    if (!this.ws) return
    this.ws.removeAllListeners()
    this.ws.close()
    this.ws = null
    this.removeAllListeners()
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
}

export default new SpotifyHandler()
