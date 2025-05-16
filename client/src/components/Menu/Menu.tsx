import { useContext, useEffect, useRef, useState, WheelEvent } from 'react'

import { AppBlurContext } from '@/contexts/AppBlurContext.tsx'
import { SocketContext } from '@/contexts/SocketContext.tsx'

import RestoreScreen from '../RestoreScreen/RestoreScreen.tsx'

import styles from './Menu.module.css'

const Menu: React.FC = () => {
  const { setBlurred } = useContext(AppBlurContext)
  const { ready, socket } = useContext(SocketContext)

  const [shown, setShown] = useState(false)
  const shownRef = useRef(shown)

  const [selected, setSelected] = useState(1)
  const [restoring, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const elements = [
    {
      name: 'Restore',
      icon: 'settings_backup_restore',
      color: '#ff3838',
      onClick: () => {
        setLoading(true)
        setMessage('Restoring...')
        setShown(false)
        socket?.send(
          JSON.stringify({
            type: 'restore'
          })
        )
      }
    },
    {
      name: 'Sleep',
      icon: 'bedtime',
      color: '#7b00ff',
      onClick: () => {
        socket?.send(
          JSON.stringify({
            type: 'sleep'
          })
        )
        setShown(false)
      }
    },
    {
      name: 'Reboot',
      icon: 'restart_alt',
      color: '#1565c0',
      onClick: () => {
        setLoading(true)
        setMessage('Rebooting...')
        setShown(false)
        socket?.send(
          JSON.stringify({
            type: 'reboot'
          })
        )
      }
    }
  ]

  useEffect(() => {
    function listener(e: KeyboardEvent) {
      if (e.key === 'm') {
        setShown(s => !s)
        ;(document.activeElement as HTMLElement)?.blur()
        setTimeout(() => {
          if (!shownRef.current) {
            setSelected(1)
          }
        }, 200)
      } else if (e.key === 'ArrowLeft' && shownRef.current) {
        e.preventDefault()
        onWheel({ deltaX: -1 } as WheelEvent<HTMLDivElement>)
      } else if (e.key === 'ArrowRight' && shownRef.current) {
        e.preventDefault()
        onWheel({ deltaX: 1 } as WheelEvent<HTMLDivElement>)
      } else if (e.key === 'Escape' && shownRef.current) {
        setShown(false)
      } else if (e.key === 'Enter' && shownRef.current) {
        elements[selected].onClick()
      }
    }

    document.addEventListener('keydown', listener)

    return () => {
      document.removeEventListener('keydown', listener)
    }
  })

  useEffect(() => {
    setBlurred(shown)
    shownRef.current = shown
  }, [shown, setBlurred])

  function onWheel(e: WheelEvent<HTMLDivElement>) {
    if (e.deltaX < 0) {
      setSelected(s => (s - 1 + elements.length) % elements.length)
    } else if (e.deltaX > 0) {
      setSelected(s => (s + 1) % elements.length)
    }
  }

  useEffect(() => {
    const listener = (e: globalThis.WheelEvent) => {
      if (shownRef.current) {
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
  })

  return (
    <>
      <div className={styles.menu} data-shown={shown}>
        <div className={styles.buttons}>
          {elements.map((element, i) => (
            <button
              key={element.name}
              data-selected={selected === i}
              disabled={!ready}
              onMouseDown={() => {
                setSelected(i)
                element.onClick()
              }}
            >
              <span
                className="material-icons"
                style={{
                  color: element.color
                }}
              >
                {element.icon}
              </span>
              <p className={styles.label}>{element.name}</p>
            </button>
          ))}
        </div>
      </div>
      {restoring && <RestoreScreen message={message} />}
    </>
  )
}

export default Menu
