import { useContext, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, WheelEvent } from 'react'

import { SocketContext } from '@/contexts/SocketContext.tsx'

import BaseWidget from '../BaseWidget/BaseWidget.tsx'

import styles from './Apps.module.css'

interface App {
  id: string
  path: string
}

interface AppsProps {
  visible?: boolean
}

const Apps: React.FC<AppsProps> = ({ visible }) => {
  const { ready, socket } = useContext(SocketContext)

  const appsRef = useRef<HTMLDivElement>(null)

  const [apps, setApps] = useState<App[] | null>(null)
  const [images, setImages] = useState<Record<string, string>>({})

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'ArrowLeft') {
      onWheel({ deltaX: -1 } as WheelEvent<HTMLDivElement>)
    } else if (e.key === 'ArrowRight') {
      onWheel({ deltaX: 1 } as WheelEvent<HTMLDivElement>)
    }
  }

  function onWheel(e: WheelEvent<HTMLDivElement>) {
    const focused = document.activeElement as HTMLElement
    if (e.deltaX < 0) {
      const prev = focused.previousElementSibling as HTMLElement
      if (prev) {
        prev.focus()
      } else {
        const last = appsRef.current?.lastElementChild as HTMLElement
        last.focus()
      }
    } else if (e.deltaX > 0) {
      const next = focused.nextElementSibling as HTMLElement
      if (next) {
        next.focus()
      } else {
        const first = appsRef.current?.firstElementChild as HTMLElement
        first.focus()
      }
    }
  }

  function onFocus() {
    if (document.activeElement !== appsRef.current) return
    const first = appsRef.current?.firstElementChild as HTMLElement
    first.focus()
  }

  function openApp(name: string) {
    socket?.send(
      JSON.stringify({
        type: 'apps',
        action: 'open',
        data: name
      })
    )
  }

  useEffect(() => {
    if (ready === true && socket) {
      const listener = (e: MessageEvent) => {
        const { type, action, data } = JSON.parse(e.data)
        if (type !== 'apps') return
        if (action === 'image') {
          setImages(i => ({ ...i, [data.id]: data.image }))
        } else {
          setApps(data)
          for (const app of data) {
            socket.send(
              JSON.stringify({
                type: 'apps',
                action: 'image',
                data: app.id
              })
            )
          }
        }
      }

      socket.addEventListener('message', listener)

      socket.send(JSON.stringify({ type: 'apps' }))

      return () => {
        socket.removeEventListener('message', listener)
      }
    }
  }, [ready, socket])

  useEffect(() => {
    const listener = (e: globalThis.WheelEvent) => {
      if (appsRef.current?.querySelector(':focus-within')) {
        e.preventDefault()
        onWheel({
          deltaX: e.deltaX
        } as WheelEvent<HTMLDivElement>)
      }
    }

    document.addEventListener('wheel', listener, {
      passive: false
    })

    return () => {
      document.removeEventListener('wheel', listener)
    }
  }, [])

  return (
    <BaseWidget
      className={styles.apps}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      ref={appsRef}
      visible={visible}
    >
      {apps ? (
        apps.length > 0 ? (
          apps.map(app => (
            <div
              className={styles.app}
              tabIndex={-1}
              key={app.id}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.stopPropagation()
                  openApp(app.id)
                }
              }}
              onClick={() => openApp(app.id)}
            >
              <img src={images[app.id]} />
            </div>
          ))
        ) : (
          <div className={styles.empty}>
            <span className="material-icons">workspaces</span>
            <p className={styles.title}>Nothing here yet!</p>
            <p className={styles.note}>
              Use the desktop app to add shortcuts.
            </p>
          </div>
        )
      ) : null}
    </BaseWidget>
  )
}

export default Apps
