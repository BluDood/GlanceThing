import React, {
  KeyboardEvent,
  useContext,
  useEffect,
  useRef,
  useState,
  WheelEvent
} from 'react'

import { MediaContext } from '@/contexts/MediaContext.tsx'
import { AppSettingsContext } from '@/contexts/AppSettingsContext.tsx'

import styles from './FullescreenPlayer.module.css'

interface FullescreenPlayerProps {
  shown: boolean
  setShown: React.Dispatch<React.SetStateAction<boolean>>
}

const FullescreenPlayer: React.FC<FullescreenPlayerProps> = ({
  shown,
  setShown
}) => {
  const { image, playerData, playerDataRef, actions } =
    useContext(MediaContext)
  const { showNothingPlayingNote } = useContext(AppSettingsContext)

  const playerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (shown) playerRef.current?.focus()
    else playerRef.current?.blur()
  }, [shown])

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    e.stopPropagation()
    e.preventDefault()

    if (e.key === 'Enter') {
      actions.playPause()
    } else if (e.key === 'ArrowLeft') {
      onWheel({ deltaX: -1 } as WheelEvent<HTMLDivElement>)
    } else if (e.key === 'ArrowRight') {
      onWheel({ deltaX: 1 } as WheelEvent<HTMLDivElement>)
    } else if (e.key === 'Escape') {
      setShown(false)
    }
  }

  function onWheel(e: WheelEvent<HTMLDivElement>) {
    if (e.deltaX < 0) {
      volumeDown()
    } else if (e.deltaX > 0) {
      volumeUp()
    }
  }

  const [volume, setVolume] = useState(0)
  const volumeRef = useRef(volume)
  const lastVolumeChange = useRef(0)
  const [volumeAdjusted, setVolumeAdjusted] = useState(false)

  function volumeUp() {
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
  }

  function volumeDown() {
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
  }

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
    if (playerData) {
      if (lastVolumeChange.current < Date.now() - 1000) {
        setVolume(playerData.volume)
        volumeRef.current = playerData.volume
      }
    }
  }, [playerData])

  return (
    <div
      className={styles.player}
      data-shown={shown}
      ref={playerRef}
      onKeyDown={onKeyDown}
      onWheel={onWheel}
      tabIndex={-1}
    >
      <button
        onClick={e => {
          setShown(false)
          e.currentTarget.blur()
        }}
        className={styles.close}
      >
        <span className="material-icons">keyboard_arrow_down</span>
      </button>
      {playerData ? (
        <>
          <img src={image} alt="" className={styles.background} />
          <div className={styles.track}>
            <div className={styles.cover}>
              {image ? (
                <img src={image} alt="" />
              ) : (
                <span className="material-icons">music_note</span>
              )}
            </div>
            <div className={styles.info}>
              <div className={styles.title}>{playerData.track.name}</div>
              <div className={styles.artist}>
                {playerData.track.artists.join(', ')}
              </div>
            </div>
          </div>
          <div className={styles.progress}>
            <div
              className={styles.bar}
              style={{
                width: `${(playerData.track.duration.current / playerData.track.duration.total) * 100}%`
              }}
            ></div>
          </div>
          <div
            className={styles.controls}
            data-hide-buttons={volumeAdjusted}
          >
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
            {playerData.supportedActions.includes('shuffle') ? (
              <button
                data-shuffle-state={playerData?.shuffle}
                onClick={() =>
                  actions.shuffle(playerData?.shuffle ? false : true)
                }
              >
                <span className="material-icons">shuffle</span>
              </button>
            ) : null}
            <button onClick={() => actions.skipBackward()}>
              <span className="material-icons">skip_previous</span>
            </button>
            <button onClick={() => actions.playPause()}>
              <span className="material-icons">
                {playerData?.isPlaying ? 'pause' : 'play_arrow'}
              </span>
            </button>
            <button onClick={() => actions.skipForward()}>
              <span className="material-icons">skip_next</span>
            </button>
            {playerData.supportedActions.includes('repeat') ? (
              <button
                data-repeat-state={playerData?.repeat !== 'off'}
                onClick={() =>
                  actions.repeat(
                    playerData?.repeat === 'off'
                      ? 'on'
                      : playerData?.repeat === 'on'
                        ? 'one'
                        : 'off'
                  )
                }
              >
                <span className="material-icons">
                  {playerData?.repeat === 'off'
                    ? 'repeat'
                    : playerData?.repeat === 'on'
                      ? 'repeat'
                      : 'repeat_one'}
                </span>
              </button>
            ) : null}
          </div>
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
    </div>
  )
}

export default FullescreenPlayer
