import React, { useCallback, useContext, useEffect, useState } from 'react'

import { SleepState } from '@/contexts/SleepContext.tsx'
import { SocketContext } from '@/contexts/SocketContext.tsx'
import { AppSettingsContext } from '@/contexts/AppSettingsContext.tsx'
import { TimeContext } from '@/contexts/TimeContext'

import styles from './Screensaver.module.css'

interface ScreensaverProps {
  type: SleepState
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB

const Screensaver: React.FC<ScreensaverProps> = ({ type }) => {
  const { ready, socket } = useContext(SocketContext)
  const { showTimeOnScreensaver, screensaverTimePosition } =
    useContext(AppSettingsContext)
  const { time, date } = useContext(TimeContext)

  const [loaded, setLoaded] = useState(false)
  const [customImage, setCustomImage] = useState<string | null>(null)

  const validateImage = useCallback(
    (imageUrl: string): Promise<boolean> => {
      return new Promise(resolve => {
        if (!imageUrl || !imageUrl.startsWith('data:image/')) {
          resolve(false)
          return
        }

        const img = new Image()
        img.onload = () => resolve(true)
        img.onerror = () => resolve(false)
        img.src = imageUrl
      })
    },
    []
  )

  useEffect(() => {
    const loadCachedImage = async () => {
      try {
        const cachedImage = localStorage.getItem('cachedScreensaverImage')
        if (cachedImage) {
          const isValid = await validateImage(cachedImage)
          if (isValid) {
            setCustomImage(cachedImage)
          } else {
            localStorage.removeItem('cachedScreensaverImage')
          }
        }
      } catch {
        localStorage.removeItem('cachedScreensaverImage')
      }
    }

    loadCachedImage()
  }, [validateImage])

  const requestImage = useCallback(() => {
    if (socket && socket.readyState === 1) {
      socket.send(
        JSON.stringify({
          type: 'screensaver',
          action: 'getImage'
        })
      )
    }
  }, [socket])

  useEffect(() => {
    if (!ready || !socket) return

    const listener = (e: MessageEvent) => {
      const data = JSON.parse(e.data)

      if (data.type !== 'screensaver') return

      switch (data.action) {
        case 'image':
          validateImage(data.data.image).then(isValid => {
            if (isValid) {
              setCustomImage(data.data.image)
              if (
                data.data.image &&
                data.data.image.length < MAX_IMAGE_SIZE
              ) {
                localStorage.setItem(
                  'cachedScreensaverImage',
                  data.data.image
                )
              }
            }
          })
          break

        case 'update':
          requestImage()
          break

        case 'removed':
          setCustomImage(null)
          localStorage.removeItem('cachedScreensaverImage')
          break
      }
    }

    socket.addEventListener('message', listener)

    requestImage()

    const retryInterval = setInterval(() => {
      if (!customImage && socket.readyState === 1) {
        requestImage()
      }
    }, 5000)

    return () => {
      socket.removeEventListener('message', listener)
      clearInterval(retryInterval)
    }
  }, [
    ready,
    socket,
    customImage,
    requestImage,
    validateImage,
    showTimeOnScreensaver,
    type
  ])

  useEffect(() => {
    if (type === 'screensaver') {
      setLoaded(true)
    } else {
      setTimeout(() => {
        setLoaded(false)
      }, 500)
    }
  }, [type])

  const renderTimeDisplay = () => {
    if (!showTimeOnScreensaver || type !== 'screensaver') return null

    const positionClass =
      styles[screensaverTimePosition] || styles['bottom-right']

    return (
      <div className={`${styles.timeContainer} ${positionClass}`}>
        <div className={styles.timeDisplay}>{time}</div>
        <div className={styles.dateDisplay}>{date}</div>
      </div>
    )
  }

  return (
    <div className={styles.screensaver} data-active={type !== 'off'}>
      {loaded && (
        <>
          {customImage ? (
            <>
              <div
                className={styles.customImage}
                style={{ backgroundImage: `url(${customImage})` }}
              ></div>
              {renderTimeDisplay()}
            </>
          ) : (
            <>
              <div className={styles.circle1}></div>
              <div className={styles.circle2}></div>
              <div className={styles.circle3}></div>
              {renderTimeDisplay()}
            </>
          )}
        </>
      )}
    </div>
  )
}

export default Screensaver
