import {
  KeyboardEvent,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  WheelEvent
} from 'react'

import { formatTime, debouncedFunction } from '@/lib/utils.ts'

import BaseWidget from '../BaseWidget/BaseWidget.tsx'

import styles from './Player.module.css'
import { MediaContext } from '@/contexts/MediaContext.tsx'
import { AppSettingsContext } from '@/contexts/AppSettingsContext.tsx'

const Player: React.FC = () => {
  const { actions, playerData, playerDataRef, image } =
    useContext(MediaContext)
  const { showNothingPlayingNote } = useContext(AppSettingsContext)

  const playerRef = useRef<HTMLDivElement>(null)
  const imageDivRef = useRef<HTMLDivElement>(null)
  const nameRef = useRef<HTMLSpanElement>(null)
  const artistsRef = useRef<HTMLSpanElement>(null)
  const nameContainerRef = useRef<HTMLDivElement>(null)
  const artistContainerRef = useRef<HTMLDivElement>(null)

  const isMounted = useRef(true)

  const trackNameDependency = playerData?.track?.name ?? ''
  const artistsDependency = playerData?.track?.artists?.join() ?? ''

  const [shouldScrollTrackName, setShouldScrollTrackName] = useState(false)
  const [shouldScrollArtists, setShouldScrollArtists] = useState(false)

  const animationFrameRef = useRef<number | null>(null)
  const scrollPauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  )
  const nameScrollPositionRef = useRef(0)
  const artistScrollPositionRef = useRef(0)
  const scrollDirectionRef = useRef(1) // 1 for left-to-right, -1 for right-to-left
  const lastAnimationTimestampRef = useRef(0)
  const animateScrollRef = useRef<((timestamp: number) => void) | null>(
    null
  )

  const [volume, setVolume] = useState(0)
  const volumeRef = useRef(volume)
  const lastVolumeChange = useRef(0)
  const [volumeAdjusted, setVolumeAdjusted] = useState(false)

  const coverClicks = useRef(0)
  const coverClickTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null
  )

  const [coverAction, setCoverAction] = useState<
    'play' | 'pause' | 'forward' | 'back' | null
  >(null)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const cleanupAnimationResources = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    if (scrollPauseTimerRef.current !== null) {
      clearTimeout(scrollPauseTimerRef.current)
      scrollPauseTimerRef.current = null
    }
  }, [])

  const pauseAndScheduleRestart = useCallback(
    (delayMs: number = 3000) => {
      cleanupAnimationResources()

      scrollPauseTimerRef.current = setTimeout(() => {
        if (
          isMounted.current &&
          !animationFrameRef.current &&
          animateScrollRef.current
        ) {
          animationFrameRef.current = requestAnimationFrame(
            animateScrollRef.current
          )
        }
      }, delayMs)
    },
    [cleanupAnimationResources]
  )

  const handleDirectionChange = useCallback(
    (toLeftToRight: boolean) => {
      scrollDirectionRef.current = toLeftToRight ? 1 : -1

      if (toLeftToRight) {
        pauseAndScheduleRestart()
        return true
      }

      return false
    },
    [pauseAndScheduleRestart]
  )

  const updateScrollPosition = useCallback(
    (
      position: number,
      maxScroll: number,
      speed: number,
      isLeftToRight: boolean
    ): {
      newPosition: number
      shouldContinue: boolean
      stopAnimation: boolean
    } => {
      let newPosition = position
      let shouldContinue = false
      let stopAnimation = false

      if (isLeftToRight) {
        // Left to right
        newPosition += speed
        shouldContinue = true

        if (newPosition >= maxScroll) {
          newPosition = maxScroll
          stopAnimation = handleDirectionChange(false) // Change to right-to-left
        }
      } else {
        // Right to left
        newPosition -= speed
        shouldContinue = true

        if (newPosition <= 0) {
          newPosition = 0
          stopAnimation = handleDirectionChange(true) // Change to left-to-right
        }
      }

      return { newPosition, shouldContinue, stopAnimation }
    },
    [handleDirectionChange]
  )

  const calculateAdaptiveSpeed = useCallback(
    (contentWidth: number, containerWidth: number): number => {
      const overflowAmount = contentWidth - containerWidth

      if (overflowAmount < 0) {
        return 0 // No overflow
      }

      switch (true) {
        case overflowAmount < 50:
          return 0.1 // Very slow for minimal overflow
        case overflowAmount < 100:
          return 0.2 // Slow for small overflow
        case overflowAmount < 200:
          return 0.3 // Medium for moderate overflow
        default:
          return 0.4 // Normal for significant overflow
      }
    },
    []
  )

  const checkElementOverflow = useCallback(
    (
      element: HTMLElement,
      container: HTMLElement
    ): { isOverflowing: boolean; overflowAmount: number } => {
      const containerWidth = container.clientWidth
      const textWidth = element.scrollWidth

      const overflowThreshold = textWidth > containerWidth + 30 ? 0 : 5
      const isOverflowing = textWidth > containerWidth + overflowThreshold

      return { isOverflowing, overflowAmount: textWidth - containerWidth }
    },
    []
  )

  const animateScroll = useCallback(
    (timestamp: number) => {
      if (!isMounted.current) return

      lastAnimationTimestampRef.current = timestamp

      let shouldContinue = false
      let nameMaxScroll = 0
      let artistsMaxScroll = 0
      let nameSpeed = 0.3
      let artistSpeed = 0.3

      if (nameRef.current && nameContainerRef.current) {
        const nameWidth = nameRef.current.scrollWidth
        const containerWidth = nameContainerRef.current.clientWidth
        nameMaxScroll = Math.max(0, nameWidth - containerWidth)
        nameSpeed = calculateAdaptiveSpeed(nameWidth, containerWidth)
      }

      if (artistsRef.current && artistContainerRef.current) {
        const artistWidth = artistsRef.current.scrollWidth
        const containerWidth = artistContainerRef.current.clientWidth
        artistsMaxScroll = Math.max(0, artistWidth - containerWidth)
        artistSpeed = calculateAdaptiveSpeed(artistWidth, containerWidth)
      }

      if (
        nameRef.current &&
        nameContainerRef.current &&
        shouldScrollTrackName &&
        nameMaxScroll > 0
      ) {
        const nameEl = nameRef.current
        const isLeftToRight = scrollDirectionRef.current === 1

        const result = updateScrollPosition(
          nameScrollPositionRef.current,
          nameMaxScroll,
          nameSpeed,
          isLeftToRight
        )

        nameScrollPositionRef.current = result.newPosition
        shouldContinue = result.shouldContinue

        nameEl.style.transform = `translateX(-${nameScrollPositionRef.current}px)`

        if (result.stopAnimation) return
      }

      if (
        artistsRef.current &&
        artistContainerRef.current &&
        shouldScrollArtists &&
        artistsMaxScroll > 0
      ) {
        const artistsEl = artistsRef.current
        if (shouldScrollTrackName && nameMaxScroll > 0) {
          const nameProgress =
            nameMaxScroll > 0
              ? nameScrollPositionRef.current / nameMaxScroll
              : 0
          artistScrollPositionRef.current = nameProgress * artistsMaxScroll
        } else {
          const isLeftToRight = scrollDirectionRef.current === 1
          const result = updateScrollPosition(
            artistScrollPositionRef.current,
            artistsMaxScroll,
            artistSpeed,
            isLeftToRight
          )
          artistScrollPositionRef.current = result.newPosition
          shouldContinue = result.shouldContinue
          if (result.stopAnimation) return
        }

        artistScrollPositionRef.current = Math.min(
          artistsMaxScroll,
          Math.max(0, artistScrollPositionRef.current)
        )
        artistsEl.style.transform = `translateX(-${artistScrollPositionRef.current}px)`
      }

      if (shouldContinue && isMounted.current) {
        animationFrameRef.current = requestAnimationFrame(
          animateScrollRef.current!
        )
      } else {
        animationFrameRef.current = null
      }
    },
    [
      shouldScrollTrackName,
      shouldScrollArtists,
      calculateAdaptiveSpeed,
      updateScrollPosition
    ]
  )

  useEffect(() => {
    animateScrollRef.current = animateScroll
  }, [animateScroll])

  useEffect(() => {
    cleanupAnimationResources()

    if (
      (shouldScrollTrackName && nameRef.current) ||
      (shouldScrollArtists && artistsRef.current)
    ) {
      nameScrollPositionRef.current = 0
      artistScrollPositionRef.current = 0
      scrollDirectionRef.current = 1 // Start left-to-right
      lastAnimationTimestampRef.current = 0

      if (nameRef.current)
        nameRef.current.style.transform = 'translateX(0)'
      if (artistsRef.current)
        artistsRef.current.style.transform = 'translateX(0)'
      pauseAndScheduleRestart(100)
    }
    return cleanupAnimationResources
  }, [
    shouldScrollTrackName,
    shouldScrollArtists,
    animateScroll,
    trackNameDependency,
    artistsDependency,
    cleanupAnimationResources,
    pauseAndScheduleRestart
  ])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        cleanupAnimationResources()
      } else if (
        (shouldScrollTrackName || shouldScrollArtists) &&
        !animationFrameRef.current
      ) {
        lastAnimationTimestampRef.current = 0 // Reset timestamp
        animationFrameRef.current = requestAnimationFrame(animateScroll)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange
      )
      cleanupAnimationResources()
    }
  }, [
    shouldScrollTrackName,
    shouldScrollArtists,
    animateScroll,
    cleanupAnimationResources
  ])

  const checkTextOverflow = useCallback(() => {
    if (!playerData || !isMounted.current) return
    requestAnimationFrame(() => {
      if (!isMounted.current) return

      requestAnimationFrame(() => {
        if (!isMounted.current) return

        const nameEl = nameRef.current
        const artistsEl = artistsRef.current
        const nameContainer = nameContainerRef.current
        const artistContainer = artistContainerRef.current

        if (nameContainer && nameEl) {
          const { isOverflowing } = checkElementOverflow(
            nameEl,
            nameContainer
          )

          if (
            isOverflowing !== shouldScrollTrackName &&
            isMounted.current
          ) {
            setShouldScrollTrackName(isOverflowing)

            if (isOverflowing) {
              nameScrollPositionRef.current = 0
              nameEl.style.transform = 'translateX(0)'
            }
          }
        }

        if (artistContainer && artistsEl) {
          const { isOverflowing } = checkElementOverflow(
            artistsEl,
            artistContainer
          )

          if (isOverflowing !== shouldScrollArtists && isMounted.current) {
            setShouldScrollArtists(isOverflowing)

            if (isOverflowing) {
              artistScrollPositionRef.current = 0
              artistsEl.style.transform = 'translateX(0)'
            }
          }
        }

        if (!shouldScrollTrackName && !shouldScrollArtists) {
          cleanupAnimationResources()
        }
      })
    })
  }, [
    playerData,
    shouldScrollTrackName,
    shouldScrollArtists,
    checkElementOverflow,
    cleanupAnimationResources
  ])

  useEffect(() => {
    const debouncedResize = debouncedFunction(() => {
      checkTextOverflow()
    }, 200)

    window.addEventListener('resize', debouncedResize)

    return () => {
      window.removeEventListener('resize', debouncedResize)
      debouncedResize.cancel()
    }
  }, [checkTextOverflow])

  // Wrap volume control functions in useCallback to maintain stable references
  const volumeUp = useCallback(() => {
    if (playerDataRef.current === null) return
    if (!playerDataRef.current.supportedActions.includes('volume')) return

    const volume = volumeRef.current

    if (volume < 100) {
      const newVolume = Math.min(volume + 10, 100)
      actions.setVolume(newVolume)
      setVolume(newVolume)
      volumeRef.current = newVolume
      lastVolumeChange.current = Date.now()
    }
  }, [actions, playerDataRef])

  const volumeDown = useCallback(() => {
    if (playerDataRef.current === null) return
    if (!playerDataRef.current.supportedActions.includes('volume')) return

    const volume = volumeRef.current

    if (volume > 0) {
      const newVolume = Math.max(volume - 10, 0)
      actions.setVolume(newVolume)
      setVolume(newVolume)
      volumeRef.current = newVolume
      lastVolumeChange.current = Date.now()
    }
  }, [actions, playerDataRef])

  // Wrap onWheel in useCallback to prevent it from changing on every render
  const onWheel = useCallback(
    (e: WheelEvent<HTMLDivElement>) => {
      if (e.deltaX < 0) {
        volumeDown()
      } else if (e.deltaX > 0) {
        volumeUp()
      }
    },
    [volumeDown, volumeUp]
  )

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter') {
        actions.playPause()
      } else if (e.key === 'ArrowLeft') {
        onWheel({ deltaX: -1 } as WheelEvent<HTMLDivElement>)
      } else if (e.key === 'ArrowRight') {
        onWheel({ deltaX: 1 } as WheelEvent<HTMLDivElement>)
      }
    },
    [actions, onWheel]
  )

  const handleCoverPress = useCallback(() => {
    coverClicks.current++

    if (coverClickTimer.current !== null) {
      clearTimeout(coverClickTimer.current)
    }

    coverClickTimer.current = setTimeout(() => {
      if (coverClicks.current === 1) {
        setCoverAction(playerDataRef.current?.isPlaying ? 'pause' : 'play')
        actions.playPause()
      } else if (coverClicks.current === 2) {
        setCoverAction('forward')
        actions.skipForward()
      } else if (coverClicks.current === 3) {
        setCoverAction('back')
        actions.skipBackward()
      }

      coverClicks.current = 0
      coverClickTimer.current = null
    }, 200)
  }, [actions, playerDataRef])

  useEffect(() => {
    if (coverAction) {
      const timer = setTimeout(() => {
        setCoverAction(null)
      }, 500)

      return () => {
        clearTimeout(timer)
      }
    }
  }, [coverAction])

  useEffect(() => {
    return () => {
      if (coverClickTimer.current !== null) {
        clearTimeout(coverClickTimer.current)
        coverClickTimer.current = null
      }
    }
  }, [])

  useEffect(() => {
    setVolumeAdjusted(true)
    const timer = setTimeout(() => {
      setVolumeAdjusted(false)
    }, 2000)

    return () => {
      clearTimeout(timer)
    }
  }, [volume])

  useEffect(() => {
    if (!playerData) return

    if (
      playerData.volume &&
      lastVolumeChange.current < Date.now() - 1000
    ) {
      setVolume(playerData.volume)
      volumeRef.current = playerData.volume
    }

    if (imageDivRef.current && imageDivRef.current.parentElement) {
      const height = imageDivRef.current.parentElement.clientHeight
      imageDivRef.current.style.width = `${height}px`
      imageDivRef.current.style.height = `${height}px`
    }

    requestAnimationFrame(() => {
      if (isMounted.current) {
        checkTextOverflow()
      }
    })
  }, [playerData, checkTextOverflow])

  useEffect(() => {
    const handleWheelEvent = (e: globalThis.WheelEvent) => {
      if (
        playerRef.current &&
        playerRef.current.matches(':focus-within')
      ) {
        e.preventDefault()
        onWheel({
          deltaX: e.deltaX
        } as WheelEvent<HTMLDivElement>)
      }
    }

    document.addEventListener('wheel', handleWheelEvent, {
      passive: false
    })

    return () => {
      document.removeEventListener('wheel', handleWheelEvent)
    }
  }, [onWheel]) // Include onWheel in the dependency array

  return (
    <BaseWidget
      className={styles.player}
      onKeyDown={onKeyDown}
      ref={playerRef}
    >
      {playerData ? (
        <>
          <button onMouseDown={handleCoverPress} className={styles.cover}>
            <div
              className={styles.action}
              data-shown={coverAction !== null}
            >
              <span
                className="material-icons"
                data-shown={coverAction === 'play'}
              >
                play_arrow
              </span>
              <span
                className="material-icons"
                data-shown={coverAction === 'pause'}
              >
                pause
              </span>
              <span
                className="material-icons"
                data-shown={coverAction === 'forward'}
              >
                skip_next
              </span>
              <span
                className="material-icons"
                data-shown={coverAction === 'back'}
              >
                skip_previous
              </span>
            </div>
            <div className={styles.image} ref={imageDivRef}>
              {image ? (
                <img src={image} />
              ) : (
                <span className="material-icons">music_note</span>
              )}
            </div>
          </button>
          <div
            className={styles.name}
            id="player-name"
            ref={nameContainerRef}
          >
            <span ref={nameRef} style={{ transform: 'translateX(0)' }}>
              {playerData.track.name}
            </span>
          </div>
          <div
            className={styles.artists}
            id="player-artists"
            ref={artistContainerRef}
          >
            <span ref={artistsRef} style={{ transform: 'translateX(0)' }}>
              {playerData.track.artists.join(', ')}
            </span>
          </div>
          <div className={styles.controls}>
            <button onMouseDown={actions.skipBackward}>
              <span className="material-icons">skip_previous</span>
            </button>
            <button onMouseDown={actions.playPause}>
              <span className="material-icons">
                {playerData.isPlaying ? 'pause' : 'play_arrow'}
              </span>
            </button>
            <button onMouseDown={actions.skipForward}>
              <span className="material-icons">skip_next</span>
            </button>
          </div>
          <div className={styles.progress}>
            <p>{formatTime(playerData.track.duration.current)}</p>
            <div className={styles.slider}>
              <div
                className={styles.fill}
                style={{
                  width: `${
                    (playerData.track.duration.current /
                      playerData.track.duration.total) *
                    100
                  }%`
                }}
              ></div>
            </div>
            <p>{formatTime(playerData.track.duration.total)}</p>
          </div>
          {playerData.supportedActions.includes('volume') && (
            <div className={styles.volume} data-shown={volumeAdjusted}>
              <button onMouseDown={volumeDown}>
                <span className="material-icons"> volume_down </span>
              </button>
              <div className={styles.slider}>
                <div
                  className={styles.fill}
                  style={{ width: `${volume}%` }}
                ></div>
              </div>
              <button onMouseDown={volumeUp}>
                <span className="material-icons"> volume_up </span>
              </button>
            </div>
          )}
        </>
      ) : (
        <div className={styles.notPlaying}>
          <span className="material-icons">music_note</span>
          <p className={styles.title}>Nothing playing!</p>
          {showNothingPlayingNote && (
            <p className={styles.note}>
              Start playing something on your computer.
            </p>
          )}
        </div>
      )}
    </BaseWidget>
  )
}

export default Player
