import React, { useContext, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { DevModeContext } from '@/contexts/DevModeContext.js'
import { ModalContext } from '@/contexts/ModalContext.js'

import styles from './Developer.module.css'

interface ServerInfo {
  running: boolean
  port: number | null
}

enum CarThingState {
  NotFound = 'not_found',
  NotInstalled = 'not_installed',
  Installing = 'installing',
  Ready = 'ready'
}

const customClientErrors = {
  extract_failed: 'Failed to extract custom client',
  invalid_custom_client:
    'Invalid custom client uploaded. Please check if the zip file directly contains the client files (such as index.html).'
}

const Developer: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { openModals, setModalOpen } = useContext(ModalContext)
  const { devMode } = useContext(DevModeContext)

  function onClickBackground(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) setModalOpen('developer', false)
  }

  const [carThingState, setCarThingState] = useState<CarThingState | null>(
    null
  )
  const carThingStateRef = useRef(carThingState)
  const [hasCustomClient, setHasCustomClient] = useState(false)

  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null)

  useEffect(() => {
    const removeListener = window.api.on('carThingState', s => {
      const state = s as CarThingState

      setCarThingState(state)
      carThingStateRef.current = state
    })

    const removeServerInfoListener = window.api.on('serverStatus', up =>
      setServerInfo(up as ServerInfo)
    )

    const timeout = setTimeout(() => {
      if (carThingStateRef.current !== null) return

      window.api.triggerCarThingStateUpdate()
    }, 200)

    window.api.getServerInfo().then(setServerInfo)

    return () => {
      clearTimeout(timeout)
      removeListener()
      removeServerInfoListener()
    }
  }, [])

  const updateHasCustomClient = async () =>
    setHasCustomClient(await window.api.hasCustomClient())

  useEffect(() => {
    updateHasCustomClient()
  }, [])

  useEffect(() => {
    if (!devMode) setModalOpen('developer', false)
  }, [devMode])

  return (
    <div
      className={styles.developer}
      data-open={openModals.includes('developer')}
      onClick={onClickBackground}
    >
      <div className={styles.box}>
        <div className={styles.header}>
          <h2>Developer Menu</h2>
          <button
            className={styles.close}
            onClick={() => setModalOpen('developer', false)}
          >
            <span className="material-icons">close</span>
          </button>
        </div>
        <div className={styles.section}>
          <div className={styles.status}>
            <div
              className={styles.dot}
              data-color={
                carThingState === null
                  ? ''
                  : carThingState === CarThingState.NotFound
                    ? 'red'
                    : [
                          CarThingState.NotInstalled,
                          CarThingState.Installing
                        ].includes(carThingState)
                      ? 'orange'
                      : 'green'
              }
            ></div>
            {carThingState === CarThingState.NotFound
              ? 'Car Thing not found'
              : carThingState === CarThingState.NotInstalled
                ? 'Car Thing not installed'
                : carThingState === CarThingState.Installing
                  ? 'Car Thing is installing'
                  : carThingState === CarThingState.Ready
                    ? 'Car Thing is ready'
                    : 'Car Thing state unknown'}
          </div>
          <div className={styles.actions}>
            <button
              onClick={() => window.api.installApp()}
              disabled={
                ![
                  CarThingState.Ready,
                  CarThingState.NotInstalled
                ].includes(carThingState!)
              }
            >
              <span className="material-icons">download</span>
              Force Install
            </button>

            {hasCustomClient ? (
              <button
                onClick={() =>
                  window.api
                    .removeCustomClient()
                    .then(updateHasCustomClient)
                }
                data-color="red"
                disabled={
                  ![
                    CarThingState.Ready,
                    CarThingState.NotInstalled
                  ].includes(carThingState!)
                }
              >
                <span className="material-icons">brush</span>
                Remove Custom
              </button>
            ) : (
              <button
                onClick={() =>
                  window.api.importCustomClient().then(res => {
                    if (typeof res === 'string')
                      alert(customClientErrors[res] || res)

                    updateHasCustomClient()
                  })
                }
                disabled={
                  ![
                    CarThingState.Ready,
                    CarThingState.NotInstalled
                  ].includes(carThingState!)
                }
              >
                <span className="material-icons">brush</span>
                Install Custom
              </button>
            )}
            <button
              data-color="red"
              onClick={() =>
                window.api.setStorageValue(
                  'installAutomatically',
                  false
                ) && window.api.restoreCarThing()
              }
              disabled={
                ![
                  CarThingState.Ready,
                  CarThingState.NotInstalled
                ].includes(carThingState!)
              }
            >
              <span className="material-icons">
                settings_backup_restore
              </span>
              Restore
            </button>
            <button
              data-color="red"
              onClick={() => window.api.rebootCarThing()}
              disabled={
                ![
                  CarThingState.Ready,
                  CarThingState.NotInstalled
                ].includes(carThingState!)
              }
            >
              <span className="material-icons">refresh</span>
              Reboot
            </button>
          </div>
        </div>
        {serverInfo ? (
          <div className={styles.section}>
            <div className={styles.status}>
              <div
                className={styles.dot}
                data-color={serverInfo.running ? 'green' : 'red'}
              ></div>
              {serverInfo.running
                ? `Server is running on port ${serverInfo.port}`
                : 'Server is stopped'}
            </div>
            <div className={styles.actions}>
              <button
                onClick={() => window.api.startServer()}
                disabled={serverInfo.running}
              >
                <span className="material-icons">play_arrow</span>
                Start
              </button>
              <button
                data-color="red"
                onClick={() => window.api.stopServer()}
                disabled={!serverInfo.running}
              >
                <span className="material-icons">block</span>
                Stop
              </button>
            </div>
          </div>
        ) : null}
        <div className={styles.bottomActions}>
          {location.pathname === '/setup' ? (
            <button onClick={() => navigate('/')}>
              <span className="material-icons">logout</span>
              Leave Setup
            </button>
          ) : (
            <button onClick={() => navigate('/setup')}>
              <span className="material-icons">tune</span>
              Enter Setup
            </button>
          )}
          <button onClick={() => window.api.openDevTools()}>
            <span className="material-icons">build</span>
            Open DevTools
          </button>
        </div>
      </div>
    </div>
  )
}

export default Developer
