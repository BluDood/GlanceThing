import React, { useContext, useEffect, useRef, useState } from 'react'

import { DevModeContext } from '@/contexts/DevModeContext.js'
import { ModalContext } from '@/contexts/ModalContext.js'

import Loader from '@/components/Loader/Loader.js'
import Switch from '@/components/Switch/Switch.js'

import styles from './Settings.module.css'

import icon from '@/assets/icon.png'
import iconNightly from '@/assets/icon-nightly.png'
import { useNavigate } from 'react-router-dom'
import { ChannelContext } from '@/contexts/ChannelContext.js'

enum Tab {
  General,
  Client,
  Appearance,
  Startup,
  Advanced,
  Logs,
  About
}

const Settings: React.FC = () => {
  const { openModals, setModalOpen } = useContext(ModalContext)
  const { devMode } = useContext(DevModeContext)

  const [currentTab, setCurrentTab] = useState<Tab>(Tab.General)

  function onClickBackground(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) setModalOpen('settings', false)
  }

  useEffect(() => {
    if (!openModals.includes('settings') && currentTab !== Tab.General) {
      setTimeout(() => setCurrentTab(Tab.General), 200)
    }
  }, [openModals.includes('settings'), currentTab])

  useEffect(() => {
    if (!devMode && currentTab === Tab.Advanced) setCurrentTab(Tab.General)
  })

  return (
    <div
      className={styles.settings}
      data-open={openModals.includes('settings')}
      onClick={onClickBackground}
    >
      <div className={styles.box}>
        <h2>
          Settings
          <button onClick={() => setModalOpen('settings', false)}>
            <span className="material-icons">close</span>
          </button>
        </h2>
        <div className={styles.content}>
          <div className={styles.tabs}>
            <button
              onClick={() => setCurrentTab(Tab.General)}
              data-active={currentTab === Tab.General}
            >
              <span className="material-icons">settings</span>
              General
            </button>
            <button
              onClick={() => setCurrentTab(Tab.Client)}
              data-active={currentTab === Tab.Client}
            >
              <span className="material-icons">devices</span>
              Client
            </button>
            <button
              onClick={() => setCurrentTab(Tab.Appearance)}
              data-active={currentTab === Tab.Appearance}
            >
              <span className="material-icons">palette</span>
              Appearance
            </button>
            <button
              onClick={() => setCurrentTab(Tab.Startup)}
              data-active={currentTab === Tab.Startup}
            >
              <span className="material-icons">security</span>
              Startup
            </button>
            {devMode ? (
              <>
                <button
                  onClick={() => setCurrentTab(Tab.Advanced)}
                  data-active={currentTab === Tab.Advanced}
                >
                  <span className="material-icons">code</span>
                  Advanced
                </button>
                <button
                  onClick={() => setCurrentTab(Tab.Logs)}
                  data-active={currentTab === Tab.Logs}
                >
                  <span className="material-icons">description</span>
                  Logs
                </button>
              </>
            ) : null}
            <button
              onClick={() => setCurrentTab(Tab.About)}
              data-active={currentTab === Tab.About}
            >
              <span className="material-icons">info</span>
              About
            </button>
          </div>
          <div className={styles.tab}>
            {currentTab === Tab.General ? (
              <GeneralTab />
            ) : currentTab === Tab.Client ? (
              <ClientTab />
            ) : currentTab === Tab.Appearance ? (
              <AppearanceTab />
            ) : currentTab === Tab.Startup ? (
              <StartupTab />
            ) : currentTab === Tab.Advanced ? (
              <AdvancedTab />
            ) : currentTab === Tab.Logs ? (
              <LogsTab />
            ) : currentTab === Tab.About ? (
              <AboutTab />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

const ToggleSetting: React.FC<{
  label: string
  description?: string
  defaultValue?: boolean
  value?: boolean
  onChange: (value: boolean) => void
}> = ({ label, description, defaultValue, value, onChange }) => {
  return (
    <div className={styles.toggleSetting}>
      <div className={styles.text}>
        <p className={styles.label}>{label}</p>
        <p className={styles.description}>{description}</p>
      </div>
      <Switch
        defaultValue={defaultValue}
        value={value}
        onChange={onChange}
      />
    </div>
  )
}

const ButtonSetting: React.FC<{
  label: string
  description?: string
  onClick: () => void
}> = ({ label, description, onClick }) => {
  return (
    <div className={styles.buttonSetting}>
      <div className={styles.text}>
        <p className={styles.label}>{label}</p>
        <p className={styles.description}>{description}</p>
      </div>
      <button onClick={onClick}>
        <span className="material-icons">arrow_forward</span>
      </button>
    </div>
  )
}

const SelectSetting: React.FC<{
  label: string
  description?: string
  defaultValue?: string | number
  value?: string | number
  options: { value: string | number; label: string }[]
  onChange: (value: string | number) => void
}> = ({ label, description, defaultValue, value, options, onChange }) => {
  return (
    <div className={styles.selectSetting}>
      <div className={styles.text}>
        <p className={styles.label}>{label}</p>
        <p className={styles.description}>{description}</p>
      </div>
      <select
        defaultValue={defaultValue}
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

const SliderSetting: React.FC<{
  label: string
  description?: string
  disabled?: boolean
  defaultValue?: number
  value?: number
  min: number
  max: number
  step: number
  onChange?: (value: number) => void
  onRelease?: (value: number) => void
}> = ({
  label,
  description,
  disabled,
  defaultValue,
  value,
  min,
  max,
  step,
  onChange,
  onRelease
}) => {
  return (
    <div className={styles.sliderSetting} data-disabled={disabled}>
      <div className={styles.text}>
        <p className={styles.label}>{label}</p>
        <p className={styles.description}>{description}</p>
      </div>
      <input
        type="range"
        defaultValue={defaultValue}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={
          onChange ? e => onChange(Number(e.target.value)) : undefined
        }
        onMouseUp={
          onRelease
            ? e => onRelease(Number(e.currentTarget.value))
            : undefined
        }
      />
    </div>
  )
}

const GeneralTab: React.FC = () => {
  const navigate = useNavigate()
  const [loaded, setLoaded] = useState(false)

  const settings = useRef<{
    installAutomatically?: boolean
  }>({})

  useEffect(() => {
    async function loadSettings() {
      settings.current = {
        installAutomatically:
          (await window.api.getStorageValue('installAutomatically')) ===
          true
      }
      setLoaded(true)
    }

    loadSettings()
  }, [])

  return (
    loaded && (
      <div className={styles.settingsTab}>
        <ToggleSetting
          label="Install Automatically"
          description="Automatically installs the web app to the CarThing when it is connected."
          defaultValue={settings.current.installAutomatically ?? false}
          onChange={value =>
            window.api.setStorageValue('installAutomatically', value)
          }
        />
        <ButtonSetting
          label="Playback Setup"
          description="Run the playback setup again to change how playback is handled."
          onClick={() => navigate('/setup?step=3')}
        />
      </div>
    )
  )
}

const ClientTab: React.FC = () => {
  const [loaded, setLoaded] = useState(false)
  const [hasCustomImage, setHasCustomImage] = useState(false)
  const [screensaverStatus, setScreensaverStatus] = useState<{
    message: string
    status: 'error' | 'success'
  } | null>(null)
  const settings = useRef<{
    timeFormat?: string
    dateFormat?: string
    autoBrightness?: boolean
    brightness?: number
    sleepMethod?: string
  }>({})

  const [autoBrightness, setAutoBrightness] = useState(false)
  const [sleepMethod, setSleepMethod] = useState('sleep')
  const [patches, setPatches] = useState<
    { name: string; description: string; installed: boolean }[] | null
  >(null)
  const [isDev, setIsDev] = useState(false)

  useEffect(() => {
    async function loadSettings() {
      settings.current = {
        timeFormat: ((await window.api.getStorageValue('timeFormat')) ||
          'HH:mm') as string,
        dateFormat: ((await window.api.getStorageValue('dateFormat')) ||
          'ddd, D MMM') as string,
        autoBrightness:
          ((await window.api.getStorageValue('autoBrightness')) ??
            true) === true,
        brightness: ((await window.api.getStorageValue('brightness')) ??
          0.5) as number,
        sleepMethod: ((await window.api.getStorageValue('sleepMethod')) ||
          'sleep') as string
      }
      setAutoBrightness(settings.current.autoBrightness ?? false)
      setSleepMethod(settings.current.sleepMethod ?? 'sleep')

      const hasImage = await window.api.hasCustomScreensaverImage()
      setHasCustomImage(hasImage)

      setLoaded(true)
    }

    window.api.isDevMode().then(setIsDev)

    loadSettings()
    loadPatches()
  }, [])

  async function loadPatches() {
    setPatches(null)
    const patches = await window.api.getPatches()

    setPatches(patches)
  }

  async function applyPatch(patchName: string) {
    await window.api.applyPatch(patchName)
    loadPatches()
  }

  return (
    loaded && (
      <div className={styles.settingsTab}>
        <SelectSetting
          label="Time Format"
          description="Displayed time format in the titlebar"
          defaultValue={settings.current.timeFormat}
          options={[
            { value: 'HH:mm', label: '24-hour' },
            { value: 'h:mm A', label: '12-hour' }
          ]}
          onChange={value =>
            window.api.setStorageValue('timeFormat', value as string)
          }
        />
        <SelectSetting
          label="Date Format"
          description="Displayed date format in the titlebar"
          defaultValue={settings.current.dateFormat}
          options={[
            { value: 'ddd, D MMM', label: 'Short' },
            { value: 'dddd, D MMMM', label: 'Long' }
          ]}
          onChange={value =>
            window.api.setStorageValue('dateFormat', value as string)
          }
        />
        <ToggleSetting
          label="Auto Brightness"
          description="Automatically adjust the brightness"
          defaultValue={settings.current.autoBrightness ?? false}
          onChange={value => {
            window.api.setStorageValue('autoBrightness', value)
            setAutoBrightness(value)
          }}
        />
        <SliderSetting
          label="Brightness"
          description="Adjust the brightness of the screen"
          disabled={autoBrightness}
          defaultValue={settings.current.brightness}
          min={0}
          max={1}
          step={0.05}
          onRelease={value =>
            window.api.setStorageValue('brightness', value as number)
          }
        />
        <SelectSetting
          label="Sleep Method"
          description="Method used for putting the CarThing to sleep"
          defaultValue={settings.current.sleepMethod}
          options={[
            { value: 'sleep', label: 'Black Screen' },
            {
              value: 'screensaver',
              label: 'Screensaver'
            }
          ]}
          onChange={value => {
            window.api.setStorageValue('sleepMethod', value as string)
            setSleepMethod(value as string)
          }}
        />

        {sleepMethod === 'screensaver' && (
          <div className={styles.screensaverSettings}>
            <div className={styles.header}>
              <div className={styles.text}>
                <p className={styles.label}>Custom Screensaver Image</p>
                <p className={styles.description}>
                  Upload a custom image to use as your screensaver
                  background
                </p>
              </div>
              <div className={styles.actions}>
                <button
                  onClick={async () => {
                    setScreensaverStatus(null)

                    const result =
                      await window.api.uploadScreensaverImage()

                    if (result && result.success) {
                      setHasCustomImage(true)
                      setScreensaverStatus({
                        message: 'Image uploaded successfully!',
                        status: 'success'
                      })
                    } else {
                      setScreensaverStatus({
                        message:
                          result.message || 'Failed to upload image',
                        status: 'error'
                      })
                    }
                  }}
                >
                  <span className="material-icons">upload</span>
                </button>
                {hasCustomImage && (
                  <button
                    data-type="danger"
                    onClick={async () => {
                      setScreensaverStatus(null)

                      const success =
                        await window.api.removeScreensaverImage()

                      if (success) {
                        setHasCustomImage(false)
                        setScreensaverStatus({
                          message: 'Image removed successfully!',
                          status: 'success'
                        })
                      } else {
                        setScreensaverStatus({
                          message: 'Failed to remove image',
                          status: 'error'
                        })
                      }
                    }}
                  >
                    <span className="material-icons">delete</span>
                  </button>
                )}
              </div>
            </div>
            {screensaverStatus && (
              <div
                className={styles.status}
                data-type={screensaverStatus.status}
              >
                <span className="material-icons">
                  {screensaverStatus.status === 'error'
                    ? 'error_outline'
                    : 'check_circle'}
                </span>
                {screensaverStatus.message}
              </div>
            )}
          </div>
        )}
        {patches && isDev ? (
          <div className={styles.patches}>
            <h2>Patches</h2>
            {patches.map(patch => (
              <Patch
                key={patch.name}
                {...patch}
                onApply={() => applyPatch(patch.name)}
              />
            ))}
          </div>
        ) : null}
      </div>
    )
  )
}

const Patch: React.FC<{
  name: string
  description: string
  installed: boolean
  onApply: () => void
}> = ({ name, description, installed, onApply }) => {
  const [applying, setApplying] = useState(false)

  return (
    <div className={styles.patch}>
      <div className={styles.info}>
        <h3>{name}</h3>
        <p>{description}</p>
      </div>
      {applying ? (
        <Loader />
      ) : installed ? (
        <span className="material-icons">check</span>
      ) : (
        <button
          onClick={() => {
            setApplying(true)
            onApply()
          }}
        >
          <span className="material-icons">get_app</span>
        </button>
      )}
    </div>
  )
}

const AppearanceTab: React.FC = () => {
  const [darkMode, setDarkMode] = useState(true)

  useEffect(() => {
    if (darkMode === false) {
      setTimeout(() => {
        setDarkMode(true)
      }, 100)
    }
  }, [darkMode])

  return (
    <div className={styles.settingsTab}>
      <ToggleSetting
        label="Dark mode"
        description={
          darkMode ? 'Enable dark mode for the app.' : 'sike u thought'
        }
        value={darkMode}
        onChange={value => setDarkMode(value)}
      />
    </div>
  )
}

const StartupTab: React.FC = () => {
  const [loaded, setLoaded] = useState(false)
  const settings = useRef<{
    launchOnStartup?: boolean
    launchMinimized?: boolean
    installOnStartup?: boolean
  }>({})

  useEffect(() => {
    async function loadSettings() {
      settings.current = {
        launchOnStartup:
          (await window.api.getStorageValue('launchOnStartup')) === true,
        launchMinimized:
          (await window.api.getStorageValue('launchMinimized')) === true
      }
      setLoaded(true)
    }

    loadSettings()
  }, [])

  return (
    loaded && (
      <div className={styles.settingsTab}>
        <ToggleSetting
          label="Launch on startup"
          description="Starts the app when you log in. This will also start the server."
          defaultValue={settings.current.launchOnStartup ?? false}
          onChange={value =>
            window.api.setStorageValue('launchOnStartup', value)
          }
        />
        <ToggleSetting
          label="Launch minimized"
          description="Starts the app minimized in the system tray."
          defaultValue={settings.current.launchMinimized ?? false}
          onChange={value =>
            window.api.setStorageValue('launchMinimized', value)
          }
        />
      </div>
    )
  )
}

const AdvancedTab: React.FC = () => {
  const { setDevMode } = useContext(DevModeContext)
  const [loaded, setLoaded] = useState(false)
  const settings = useRef<{
    disableSocketAuth?: boolean
    logLevel?: number
  }>({})

  useEffect(() => {
    async function loadSettings() {
      settings.current = {
        disableSocketAuth:
          (await window.api.getStorageValue('disableSocketAuth')) === true,
        logLevel: ((await window.api.getStorageValue('logLevel')) ||
          1) as number
      }
      setLoaded(true)
    }

    loadSettings()
  }, [])

  return (
    loaded && (
      <div className={styles.settingsTab}>
        <ToggleSetting
          label="Developer Mode"
          description="Enables some options for development purposes."
          defaultValue={true}
          onChange={() => setDevMode(false)}
        />
        <SelectSetting
          label="Log Level"
          description="Useful for debugging purposes."
          defaultValue={settings.current.logLevel}
          options={[
            { value: 0, label: 'Debug' },
            { value: 1, label: 'Info' },
            { value: 2, label: 'Warn' },
            { value: 3, label: 'Error' }
          ]}
          onChange={value =>
            window.api.setStorageValue(
              'logLevel',
              parseInt(value as string)
            )
          }
        />
        <ToggleSetting
          label="Disable WebSocket Authentication"
          description="Allows connections to the WebSocket server without authentication."
          defaultValue={settings.current.disableSocketAuth ?? false}
          onChange={value =>
            window.api.setStorageValue('disableSocketAuth', value)
          }
        />
      </div>
    )
  )
}

const LogsTab: React.FC = () => {
  const logsRef = useRef<HTMLDivElement>(null)
  const [logs, setLogs] = useState<string[]>([])

  const [loaded, setLoaded] = useState(false)
  const settings = useRef<{
    logLevel?: number
  }>({})

  useEffect(() => {
    async function loadSettings() {
      settings.current = {
        logLevel: ((await window.api.getStorageValue('logLevel')) ||
          1) as number
      }
      setLoaded(true)
    }

    loadSettings()
  }, [])

  useEffect(() => {
    const updateLogs = async () => setLogs(await window.api.getLogs())

    const interval = setInterval(() => {
      updateLogs()
    }, 500)

    updateLogs()

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scroll({
        top: logsRef.current.scrollHeight,
        behavior: 'smooth'
      })
    }
  }, [logsRef.current])

  useEffect(() => {
    if (logsRef.current) {
      const currentScroll =
        logsRef.current.scrollHeight - logsRef.current.clientHeight

      if (currentScroll <= logsRef.current.scrollTop + 200) {
        logsRef.current.scroll({
          top: logsRef.current.scrollHeight,
          behavior: 'smooth'
        })
      }
    }
  }, [logs])

  return loaded ? (
    <div className={styles.logsTab}>
      <div className={styles.logs} ref={logsRef}>
        {logs.map((log, i) => (
          <p key={i} className={styles.log}>
            {log}
          </p>
        ))}
      </div>
      <div className={styles.controls}>
        <div className={styles.level}>
          <p>Log level</p>
          <select
            defaultValue={settings.current.logLevel}
            onChange={e =>
              window.api.setStorageValue(
                'logLevel',
                parseInt(e.target.value as string)
              )
            }
          >
            <option value="0">Debug</option>
            <option value="1">Info</option>
            <option value="2">Warn</option>
            <option value="3">Error</option>
          </select>
        </div>
        <div className={styles.buttons}>
          <button
            onClick={() => window.api.clearLogs().then(() => setLogs([]))}
            className={styles.clear}
            data-type="danger"
          >
            <span className="material-icons">delete_forever</span>
          </button>
          <button
            onClick={() => window.api.downloadLogs()}
            className={styles.download}
          >
            <span className="material-icons">download</span>
          </button>
        </div>
      </div>
    </div>
  ) : null
}

const AboutTab: React.FC = () => {
  const { devMode, setDevMode } = useContext(DevModeContext)
  const { channel } = useContext(ChannelContext)

  const [version, setVersion] = useState<string | null>(null)
  const [timesClicked, setTimesClicked] = useState(0)

  useEffect(() => {
    window.api.getVersion().then(setVersion)
  }, [])

  useEffect(() => {
    if (timesClicked <= 0) return

    if (devMode) return

    if (timesClicked >= 5) setDevMode(true)
  }, [timesClicked])

  return (
    <div className={styles.aboutTab}>
      <div className={styles.app}>
        <img src={channel === 'nightly' ? iconNightly : icon} alt="" />
        <div className={styles.info}>
          <h2>GlanceThing{channel === 'nightly' ? ' Nightly' : ''}</h2>
          <p
            onClick={() => setTimesClicked(t => (t += 1))}
            className={styles.version}
          >
            Version {version}
          </p>
        </div>
      </div>
      <h2>Credits</h2>
      <div className={styles.credit}>
        <img src="https://api.bludood.com/avatar?size=48" alt="" />
        <div className={styles.info}>
          <a href="https://bludood.com" target="_blank" rel="noreferrer">
            BluDood
          </a>
          <p>GlanceThing Developer</p>
        </div>
      </div>
      <div className={styles.credit}>
        <img
          src="https://avatars.githubusercontent.com/u/131838720?size=48"
          alt=""
        />
        <div className={styles.info}>
          <a
            href="https://github.com/ItsRiprod"
            target="_blank"
            rel="noreferrer"
          >
            ItsRiprod
          </a>
          <p>Developer of DeskThing, heavily inspired this project</p>
        </div>
      </div>
    </div>
  )
}

export default Settings
