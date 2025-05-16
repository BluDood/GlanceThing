export type RepeatMode = 'off' | 'on' | 'one'

export type Action =
  | 'play'
  | 'pause'
  | 'next'
  | 'previous'
  | 'shuffle'
  | 'repeat'
  | 'volume'
  | 'image'

export type PlaybackData = {
  isPlaying: boolean
  volume: number
  shuffle: boolean
  repeat: RepeatMode
  track: {
    name: string
    artists: string[]
    album: string
    duration: {
      current: number
      total: number
    }
  }
  supportedActions: Action[]
} | null

export type PlaybackHandlerEvents = {
  playback: (data: PlaybackData) => void
  image: (data: string) => void
  open: (handlerName?: string) => void
  close: () => void
  error: (err: Error) => void
}

export interface LyricsResponse {
  lyrics?: {
    syncType: string
    lines: {
      startTimeMs: string
      endTimeMs: string
      words: string
      syllables?: {
        startTimeMs: string
        endTimeMs: string
        text: string
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
