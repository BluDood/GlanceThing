import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback
} from 'react'

import { SocketContext } from './SocketContext.tsx'

import { PlaybackData, RepeatMode } from '@/types/Playback.js'
import { AppSettingsContext } from './AppSettingsContext.tsx'

interface LyricsLine {
  startTimeMs: string
  endTimeMs: string
  words: string
  syllables: {
    startTimeMs: string
    endTimeMs: string
    text: string
  }[]
}

interface rgbColor {
  r: number
  g: number
  b: number
  a?: number
}

interface LyricsData {
  lyrics: {
    syncType: string
    lines: LyricsLine[]
  }
  colors: {
    background: rgbColor
    text: rgbColor
    highlightText: rgbColor
  }
  hasVocalRemoval: boolean
  message: string
}

interface MediaContextProps {
  image: string
  playerData: PlaybackData | null
  playerDataRef: React.MutableRefObject<PlaybackData | null>
  lyricsData: LyricsData | null
  currentLineIndex: number
  actions: {
    playPause: () => void
    skipForward: () => void
    skipBackward: () => void
    setVolume: (volume: number) => void
    shuffle: (state: boolean) => void
    repeat: (state: RepeatMode) => void
  }
}

const MediaContext = createContext<MediaContextProps>({
  image: '',
  playerData: null,
  playerDataRef: { current: null },
  lyricsData: null,
  currentLineIndex: -1,
  actions: {
    playPause: () => {},
    skipForward: () => {},
    skipBackward: () => {},
    setVolume: () => {},
    shuffle: () => {},
    repeat: () => {}
  }
})

interface MediaContextProviderProps {
  children: React.ReactNode
}

const MediaContextProvider = ({ children }: MediaContextProviderProps) => {
  const { ready, socket } = useContext(SocketContext)
  const { showLyricsWidget } = useContext(AppSettingsContext)
  const socketRef = useRef<WebSocket | null>(null)

  const [playerData, setPlayerData] = useState<PlaybackData | null>(null)
  const playerDataRef = useRef<PlaybackData | null>(null)
  const [image, setImage] = useState('')
  const [lyricsData, setLyricsData] = useState<LyricsData | null>(null)
  const [currentLineIndex, setCurrentLineIndex] = useState<number>(-1)

  useEffect(() => {
    if (
      !playerData?.isPlaying ||
      !lyricsData?.lyrics?.lines ||
      lyricsData.lyrics.lines.length === 0
    )
      return

    const currentTime = playerData.track.duration.current

    let foundIndex = -1
    const lines = lyricsData.lyrics.lines

    if (currentTime < parseInt(lines[0].startTimeMs)) {
      if (currentLineIndex !== -1) {
        setCurrentLineIndex(-1)
      }
      return
    }

    for (let i = 0; i < lines.length; i++) {
      const startMs = parseInt(lines[i].startTimeMs)
      const endMs = parseInt(lines[i].endTimeMs) || startMs

      if (currentTime >= startMs && currentTime <= endMs) {
        foundIndex = i
        break
      }

      if (currentTime < startMs && i > 0) {
        foundIndex = i - 1
        break
      }
    }

    if (foundIndex !== currentLineIndex) {
      setCurrentLineIndex(foundIndex)
    }
  }, [playerData, lyricsData, currentLineIndex])

  const hasTrackChanged = useCallback((newData: PlaybackData) => {
    const currentTrack = playerDataRef.current?.track
    const newTrack = newData.track
    if (!currentTrack) return true
    if (currentTrack.name !== newTrack.name) return true
    if (currentTrack.artists.length !== newTrack.artists.length)
      return true
    for (let i = 0; i < currentTrack.artists.length; i++) {
      if (currentTrack.artists[i] !== newTrack.artists[i]) return true
    }

    return false
  }, [])

  const handleSocketMessage = useCallback(
    (e: MessageEvent) => {
      try {
        const { type, action, data } = JSON.parse(e.data)
        if (type !== 'playback') return

        if (action === 'image') {
          setImage(`data:image/png;base64,${data}`)
          return
        }

        if (action === 'lyrics') {
          setLyricsData(data)
          return
        }

        if (!data) {
          setPlayerData(null)
          setLyricsData(null)
          return
        }

        const playbackData = data as PlaybackData
        if (hasTrackChanged(playbackData)) {
          socket?.send(
            JSON.stringify({ type: 'playback', action: 'image' })
          )
          if (showLyricsWidget) {
            socket?.send(
              JSON.stringify({ type: 'playback', action: 'lyrics' })
            )
          }
        }

        setPlayerData(prevData => {
          if (!prevData) return playbackData
          const hasChanged =
            hasTrackChanged(playbackData) ||
            prevData.isPlaying !== playbackData.isPlaying ||
            prevData.volume !== playbackData.volume ||
            prevData.shuffle !== playbackData.shuffle ||
            prevData.repeat !== playbackData.repeat ||
            prevData.track.duration.current !==
              playbackData.track.duration.current ||
            prevData.track.duration.total !==
              playbackData.track.duration.total

          return hasChanged ? playbackData : prevData
        })
      } catch (err) {
        console.error('Error parsing message:', err)
      }
    },
    [hasTrackChanged, showLyricsWidget, socket]
  )

  useEffect(() => {
    if (socketRef.current && socketRef.current !== socket) {
      const prevSocket = socketRef.current
      prevSocket.removeEventListener('message', handleSocketMessage)
    }
    socketRef.current = socket
    if (ready === true && socket) {
      socket.send(JSON.stringify({ type: 'playback' }))
      socket.addEventListener('message', handleSocketMessage)
      const refreshInterval = setInterval(() => {
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(
            JSON.stringify({
              type: 'playback'
            })
          )
        }
      }, 10000)
      return () => {
        socket.removeEventListener('message', handleSocketMessage)
        clearInterval(refreshInterval)
      }
    }
    return () => {
      socketRef.current = null
    }
  }, [ready, socket, handleSocketMessage])

  useEffect(() => {
    if (!playerData || !playerData.isPlaying) return
    const interval = setInterval(() => {
      setPlayerData(p => {
        if (!p || p.track.duration.current >= p.track.duration.total)
          return p
        return {
          ...p,
          track: {
            ...p.track,
            duration: {
              ...p.track.duration,
              current: p.track.duration.current + 1000
            }
          }
        }
      })
    }, 1000)

    return () => {
      clearInterval(interval)
    }
  }, [playerData])

  useEffect(() => {
    playerDataRef.current = playerData
  }, [playerData])

  type CommandData = {
    volume?: number
    state?: boolean | RepeatMode
  }

  const sendSocketCommand = useCallback(
    (type: string, action: string, data?: CommandData) => {
      const currentSocket = socket || socketRef.current
      if (!currentSocket || currentSocket.readyState !== WebSocket.OPEN)
        return false

      currentSocket.send(
        JSON.stringify({
          type,
          action,
          data
        })
      )

      return true
    },
    [socket]
  )

  const actions = {
    playPause: () => {
      if (playerDataRef.current === null) return

      if (
        sendSocketCommand(
          'playback',
          playerDataRef.current?.isPlaying ? 'pause' : 'play'
        )
      ) {
        setPlayerData({
          ...playerDataRef.current!,
          isPlaying: !playerDataRef.current?.isPlaying
        })
      }
    },
    skipForward: () => {
      if (playerDataRef.current === null) return
      sendSocketCommand('playback', 'next')
    },
    skipBackward: () => {
      if (playerDataRef.current === null) return
      sendSocketCommand('playback', 'previous')
    },
    setVolume: (volume: number) => {
      if (playerDataRef.current === null) return

      if (sendSocketCommand('playback', 'volume', { volume })) {
        setPlayerData({
          ...playerDataRef.current!,
          volume: volume
        })
      }
    },
    shuffle: (state: boolean) => {
      if (playerDataRef.current === null) return

      if (sendSocketCommand('playback', 'shuffle', { state })) {
        setPlayerData({
          ...playerDataRef.current!,
          shuffle: state
        })
      }
    },
    repeat: (state: RepeatMode) => {
      if (playerDataRef.current === null) return

      if (sendSocketCommand('playback', 'repeat', { state })) {
        setPlayerData({
          ...playerDataRef.current!,
          repeat: state as RepeatMode
        })
      }
    }
  }

  return (
    <MediaContext.Provider
      value={{
        image,
        playerData,
        playerDataRef,
        lyricsData,
        currentLineIndex,
        actions
      }}
    >
      {children}
    </MediaContext.Provider>
  )
}

export { MediaContext, MediaContextProvider }
