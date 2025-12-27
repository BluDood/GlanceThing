import WebSocket, { ClientOptions } from 'ws'
import axios, { AxiosInstance } from 'axios'
import { TOTP } from 'totp-generator'

import { log, random, safeParse } from '../utils.js'
import { BasePlaybackHandler } from './BasePlaybackHandler.js'

import { Action, PlaybackData, RepeatMode } from '../../types/Playback.js'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'
const SEC_UA =
  '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"'
const CLIENT_VERSION = '1.2.81.13.gc3aea6b0'
const HARMONY_CLIENT_VERSION = '4.62.1-5dc29b8a7'

const BROWSER_HEADERS = {
  accept: 'application/json',
  'accept-language': 'en-US,en;q=0.9',
  'content-type': 'application/json',
  origin: 'https://open.spotify.com',
  priority: 'u=1, i',
  referer: 'https://open.spotify.com/',
  'sec-ch-ua': SEC_UA,
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-site',
  'user-agent': USER_AGENT
}

const SOCKET_HEADERS = {
  'accept-language': 'en-US,en;q=0.9',
  origin: 'https://open.spotify.com',
  'user-agent': USER_AGENT
}

async function generateTotp(): Promise<{
  otp: string
  version: string
} | null> {
  const res = await axios.get(
    `https://gist.github.com/BluDood/1c82e1086a21adfad5e121f255774d57/raw?${Date.now()}}`
  )
  if (res.status !== 200) return null

  const totp = TOTP.generate(res.data.secret)

  return {
    otp: totp.otp,
    version: res.data.version
  }
}

export async function getWebToken(sp_dc: string) {
  const totp = await generateTotp()
  if (!totp) throw new Error('Failed to generate TOTP')

  const res = await axios.get('https://open.spotify.com/api/token', {
    headers: {
      ...BROWSER_HEADERS,
      cookie: `sp_dc=${sp_dc};`
    },
    params: {
      reason: 'init',
      productType: 'web-player',
      totp: totp.otp,
      totpServer: totp.otp,
      totpVer: totp.version
    },
    validateStatus: () => true
  })

  if (res.status !== 200) throw new Error('Invalid sp_dc')

  if (!res.data.accessToken) throw new Error('Invalid sp_dc')

  return {
    accessToken: res.data.accessToken,
    clientId: res.data.clientId
  }
}

async function getClientToken(clientId: string) {
  const res = await axios.post(
    'https://clienttoken.spotify.com/v1/clienttoken',
    {
      client_data: {
        client_version: CLIENT_VERSION,
        client_id: clientId,
        js_sdk_data: {
          device_brand: 'unknown',
          device_model: 'unknown',
          os: 'windows',
          os_version: 'NT 10.0',
          device_id: crypto.randomUUID(),
          device_type: 'computer'
        }
      }
    },
    {
      headers: {
        ...BROWSER_HEADERS
      },
      validateStatus: () => true
    }
  )

  if (res.status !== 200) {
    throw new Error('Failed to get Spotify client token')
  }

  return res.data.granted_token.token
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
  clientToken: string | null = null
  retriedLogin = false

  ws: WebSocket | null = null
  instance: AxiosInstance | null = null
  webInstance: AxiosInstance | null = null

  async setup(config: SpotifyConfig): Promise<void> {
    log('Setting up', 'Spotify')

    this.config = config

    this.instance = axios.create({
      baseURL: 'https://api.spotify.com/v1',
      validateStatus: () => true
    })

    this.instance.interceptors.request.use(config => {
      if (this.accessToken) {
        config.headers.Authorization = `Bearer ${this.accessToken}`
      }

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

    this.webInstance = axios.create({
      headers: {
        ...BROWSER_HEADERS
      },
      validateStatus: () => true
    })

    this.webInstance.interceptors.request.use(config => {
      if (this.webToken && this.clientToken) {
        config.headers.Authorization = `Bearer ${this.webToken}`
        config.headers['client-token'] = this.clientToken
      }

      return config
    })

    this.webInstance.interceptors.response.use(async response => {
      if (response.status === 401) {
        if (this.retriedLogin) {
          log('Spotify re-authentication failed', 'Spotify')
          this.retriedLogin = false
          return response
        }

        log('Spotify token expired, re-authenticating...', 'Spotify')
        await this.loginWeb()
        this.retriedLogin = true
        const request = response.config
        return this.webInstance!.request(request)
      } else if (response.status >= 400 && response.status < 600) {
        log(
          `Spotify API returned status ${response.status} for ${response.config.url}`,
          'Spotify'
        )
      }

      this.retriedLogin = false

      return response
    })

    await this.loginWeb()
    await this.login()

    this.ws = new WebSocket(
      `wss://dealer.spotify.com/?access_token=${this.webToken}`,
      {
        headers: {
          ...SOCKET_HEADERS
        }
      } as ClientOptions
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
      const msg = safeParse(d.toString())
      if (!msg) return

      if (msg.headers?.['Spotify-Connection-Id']) {
        await this.subscribe(msg.headers['Spotify-Connection-Id'])
          .then(() => this.emit('open', this.name))
          .catch(err => this.emit('error', err))
        return
      }

      const event = msg.payloads?.[0]
      if (!event) return

      if (
        ['DEVICE_STATE_CHANGED', 'DEVICE_VOLUME_CHANGED'].includes(
          event.update_reason
        )
      ) {
        if (!event.cluster.active_device_id) {
          this.emit('playback', null)
        } else {
          this.emit('playback', await this.getPlayback())
        }
      } else if (event.update_reason === 'DEVICES_DISAPPEARED') {
        if (!event.cluster.active_device_id) this.emit('playback', null)
      }
    })

    this.ws.on('close', () => this.emit('close'))

    this.ws.on('error', err => this.emit('error', err))
  }

  async loginWeb() {
    if (!this.config) return

    const { sp_dc } = this.config

    this.webToken = null
    this.clientToken = null

    const token = await getWebToken(sp_dc).catch(err => {
      this.emit('error', err)
      return null
    })
    if (!token) return
    this.webToken = token.accessToken

    const clientToken = await getClientToken(token.clientId).catch(err => {
      this.emit('error', err)
      return null
    })
    if (!clientToken) return
    this.clientToken = clientToken
  }

  async login() {
    if (!this.config) return

    const { clientId, clientSecret, refreshToken } = this.config

    this.accessToken = null

    const accessToken = await refreshAccessToken(
      clientId,
      clientSecret,
      refreshToken
    ).catch(err => {
      this.emit('error', err)
      return null
    })
    if (!accessToken) return
    this.accessToken = accessToken
  }

  async subscribe(connectionId: string) {
    const deviceId = random(40)

    log(`Creating device with ID ${deviceId}`, 'Spotify')

    const deviceRes = await this.webInstance!.post(
      'https://gew4-spclient.spotify.com/track-playback/v1/devices',
      {
        device: {
          brand: 'spotify',
          capabilities: {
            change_volume: true,
            enable_play_token: true,
            supports_file_media_type: true,
            play_token_lost_behavior: 'pause',
            disable_connect: true,
            audio_podcasts: true,
            video_playback: true,
            manifest_formats: [
              'file_ids_mp3',
              'file_urls_mp3',
              'manifest_urls_audio_ad',
              'manifest_ids_video',
              'file_urls_external',
              'file_ids_mp4',
              'file_ids_mp4_dual',
              'manifest_urls_audio_ad'
            ],
            supports_preferred_media_type: true,
            supports_playback_offsets: true,
            supports_playback_speed: true
          },
          device_id: deviceId,
          device_type: 'computer',
          metadata: {},
          model: 'web_player',
          name: 'Web Player (Chrome)',
          platform_identifier:
            'web_player windows 10;chrome 142.0.0.0;desktop',
          is_group: false
        },
        outro_endcontent_snooping: false,
        connection_id: connectionId,
        client_version: `harmony:${HARMONY_CLIENT_VERSION}`,
        volume: 65535
      },
      {
        headers: {
          ...BROWSER_HEADERS
        }
      }
    )

    if (deviceRes.status !== 200) {
      log(`Failed to create device: ${deviceRes.status}`, 'Spotify')
      return
    }

    log(
      `Updating connection state of device hobs_${deviceId.slice(0, 34)}`,
      'Spotify'
    )

    const connectRes = await this.webInstance!.put(
      `https://gew4-spclient.spotify.com/connect-state/v1/devices/hobs_${deviceId.slice(
        0,
        34
      )}`,
      {
        member_type: 'CONNECT_STATE',
        device: {
          device_info: {
            capabilities: {
              can_be_player: false,
              hidden: true,
              needs_full_player_state: false
            }
          }
        }
      },
      {
        headers: {
          ...BROWSER_HEADERS,
          'X-Spotify-Connection-Id': connectionId
        }
      }
    )

    if (connectRes.status !== 200) {
      log(`Failed to update device: ${connectRes.status}`, 'Spotify')
      return
    }
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
