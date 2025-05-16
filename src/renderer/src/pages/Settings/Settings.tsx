import React, { useContext, useEffect, useRef, useState } from 'react'

import { DevModeContext } from '@/contexts/DevModeContext.js'
import { ModalContext } from '@/contexts/ModalContext.js'

import Loader from '@/components/Loader/Loader.js'
import Switch from '@/components/Switch/Switch.js'

import styles from './Settings.module.css'

import icon from '@/assets/icon.png'
import { useNavigate } from 'react-router-dom'

enum Tab {
  General,
  Client,
  Weather,
  Appearance,
  Startup,
  Advanced,
  Logs,
  About
}

const Settings: React.FC = () => {
  const { settingsOpen, setSettingsOpen } = useContext(ModalContext)
  const { devMode } = useContext(DevModeContext)

  const [currentTab, setCurrentTab] = useState<Tab>(Tab.General)

  function onClickBackground(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) setSettingsOpen(false)
  }

  useEffect(() => {
    if (!settingsOpen && currentTab !== Tab.General) {
      setTimeout(() => setCurrentTab(Tab.General), 200)
    }
  }, [settingsOpen, currentTab])

  useEffect(() => {
    if (!devMode && currentTab === Tab.Advanced) setCurrentTab(Tab.General)
  })

  return (
    <div
      className={styles.settings}
      data-open={settingsOpen}
      onClick={onClickBackground}
    >
      <div className={styles.box}>
        <h2>
          Settings
          <button onClick={() => setSettingsOpen(false)}>
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
              onClick={() => setCurrentTab(Tab.Weather)}
              data-active={currentTab === Tab.Weather}
            >
              <span className="material-icons">cloud</span>
              Weather
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
            ) : currentTab === Tab.Weather ? (
              <WeatherTab />
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

const CoordinatesInputSetting: React.FC<{
  label: string
  description?: string
  latDefaultValue?: string
  longDefaultValue?: string
  latValue?: string
  longValue?: string
  submitLabel?: string
  onChange?: (value: string) => void
  onSubmit: (latValue: string, longValue: string) => void
  disabled?: boolean
}> = ({
  label,
  description,
  latDefaultValue,
  longDefaultValue,
  latValue,
  longValue,
  submitLabel,
  onChange,
  onSubmit,
  disabled
}) => {
  const latInput = useRef<HTMLInputElement>(null)
  const longInput = useRef<HTMLInputElement>(null)

  return (
    <div className={styles.coordinatesInput}>
      <div className={styles.text}>
        <p className={styles.label}>{label}</p>
        <p className={styles.description}>{description}</p>
      </div>
      <div className={styles.form}>
        <input
          type="text"
          defaultValue={latDefaultValue}
          value={latValue}
          disabled={disabled}
          onChange={onChange ? e => onChange(e.target.value) : undefined}
          ref={latInput}
          placeholder="Latitude"
        />
        <input
          type="text"
          defaultValue={longDefaultValue}
          value={longValue}
          disabled={disabled}
          onChange={onChange ? e => onChange(e.target.value) : undefined}
          ref={longInput}
          placeholder="Longitude"
        />
        <button
          disabled={disabled}
          onClick={() =>
            onSubmit(latInput?.current!.value, longInput?.current!.value)
          }
        >
          {submitLabel || 'Submit'}
        </button>
      </div>
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
    showStatusBar?: boolean
    showTimeWidget?: boolean
    showWeatherWidget?: boolean
    showAppsWidget?: boolean
    showControlsWidget?: boolean
    showLyricsWidget?: boolean
    showNothingPlayingNote?: boolean
    showTimeOnScreensaver?: boolean
    screensaverTimePosition?: string
    autoSwitchToLyrics?: boolean
    showTimeInStatusBar?: boolean
    showWeatherInStatusBar?: boolean
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
          'sleep') as string,
        showStatusBar:
          ((await window.api.getStorageValue('showStatusBar')) ?? true) ===
          true,
        showTimeWidget:
          ((await window.api.getStorageValue('showTimeWidget')) ??
            true) === true,
        showWeatherWidget:
          ((await window.api.getStorageValue('showWeatherWidget')) ??
            true) === true,
        showAppsWidget:
          ((await window.api.getStorageValue('showAppsWidget')) ??
            true) === true,
        showControlsWidget:
          ((await window.api.getStorageValue('showControlsWidget')) ??
            true) === true,
        showLyricsWidget:
          ((await window.api.getStorageValue('showLyricsWidget')) ??
            true) === true,
        showNothingPlayingNote:
          ((await window.api.getStorageValue('showNothingPlayingNote')) ??
            true) === true,
        showTimeOnScreensaver:
          ((await window.api.getStorageValue('showTimeOnScreensaver')) ??
            true) === true,
        screensaverTimePosition: ((await window.api.getStorageValue(
          'screensaverTimePosition'
        )) || 'bottom-right') as string,
        autoSwitchToLyrics:
          ((await window.api.getStorageValue('autoSwitchToLyrics')) ??
            false) === true,
        showTimeInStatusBar:
          ((await window.api.getStorageValue('showTimeInStatusBar')) ??
            true) === true,
        showWeatherInStatusBar:
          ((await window.api.getStorageValue('showWeatherInStatusBar')) ??
            true) === true
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
        <h3>Status Bar</h3>
        <ToggleSetting
          label="Status Bar"
          description="Show the status bar at the top of the screen"
          defaultValue={settings.current.showStatusBar ?? true}
          onChange={value =>
            window.api.setStorageValue('showStatusBar', value)
          }
        />
        <ToggleSetting
          label="Time in Status Bar"
          description="Show the time in the status bar"
          defaultValue={settings.current.showTimeInStatusBar ?? true}
          onChange={value =>
            window.api.setStorageValue('showTimeInStatusBar', value)
          }
        />
        <ToggleSetting
          label="Weather in Status Bar"
          description="Show the weather in the status bar"
          defaultValue={settings.current.showWeatherInStatusBar ?? true}
          onChange={value =>
            window.api.setStorageValue('showWeatherInStatusBar', value)
          }
        />
        <h3>Widget</h3>
        <ToggleSetting
          label="Time Widget"
          description="Show the time widget on the home screen"
          defaultValue={settings.current.showTimeWidget ?? true}
          onChange={value =>
            window.api.setStorageValue('showTimeWidget', value)
          }
        />
        <ToggleSetting
          label="Weather Widget"
          description="Show the weather widget on the home screen"
          defaultValue={settings.current.showWeatherWidget ?? true}
          onChange={value =>
            window.api.setStorageValue('showWeatherWidget', value)
          }
        />
        <ToggleSetting
          label="Apps Widget"
          description="Show the apps widget on the home screen"
          defaultValue={settings.current.showAppsWidget ?? true}
          onChange={value =>
            window.api.setStorageValue('showAppsWidget', value)
          }
        />
        <ToggleSetting
          label="Controls Widget"
          description="Show the controls widget on the home screen"
          defaultValue={settings.current.showControlsWidget ?? true}
          onChange={value =>
            window.api.setStorageValue('showControlsWidget', value)
          }
        />
        <ToggleSetting
          label="Lyrics Widget"
          description="Show the lyrics widget on the home screen"
          defaultValue={settings.current.showLyricsWidget ?? true}
          onChange={value =>
            window.api.setStorageValue('showLyricsWidget', value)
          }
        />
        <ToggleSetting
          label="Auto Switch to Lyrics"
          description="Automatically switch to the lyrics section when a song with lyrics is playing"
          defaultValue={settings.current.autoSwitchToLyrics ?? false}
          onChange={value =>
            window.api.setStorageValue('autoSwitchToLyrics', value)
          }
        />
        <h3>Display</h3>
        <ToggleSetting
          label="Nothing Playing Note"
          description="Show the 'Start playing something on your computer' note in the Player widget"
          defaultValue={settings.current.showNothingPlayingNote ?? true}
          onChange={value =>
            window.api.setStorageValue('showNothingPlayingNote', value)
          }
        />

        <h3>Time Settings</h3>
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

        <h3>Brightness</h3>
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

        <h3>Device</h3>
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
            <ToggleSetting
              label="Show Time on Screensaver"
              description="Display current time when screensaver is active"
              defaultValue={settings.current.showTimeOnScreensaver ?? true}
              onChange={value => {
                window.api.setStorageValue('showTimeOnScreensaver', value)
              }}
            />
            {settings.current.showTimeOnScreensaver && (
              <SelectSetting
                label="Time Position"
                description="Choose where to display the time on the screensaver"
                defaultValue={
                  settings.current.screensaverTimePosition ||
                  'bottom-right'
                }
                options={[
                  { value: 'bottom-right', label: 'Bottom Right' },
                  { value: 'bottom-left', label: 'Bottom Left' },
                  { value: 'bottom-center', label: 'Bottom Center' },
                  { value: 'top-right', label: 'Top Right' },
                  { value: 'top-left', label: 'Top Left' },
                  { value: 'top-center', label: 'Top Center' },
                  { value: 'center', label: 'Center' }
                ]}
                onChange={value => {
                  window.api.setStorageValue(
                    'screensaverTimePosition',
                    value as string
                  )
                }}
              />
            )}
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

const WeatherTab: React.FC = () => {
  const [loaded, setLoaded] = useState(false)
  const [update, setUpdate] = useState(false)
  const [updateError, setUpdateError] = useState(false)
  const [updateMessage, setUpdateMessage] = useState<string>('')
  const settings = useRef<{
    latitude?: number
    longitude?: number
    temperatureUnit?: string
    locationFormat?: string
    showTempUnit?: boolean
  }>({})

  useEffect(() => {
    async function loadSettings() {
      settings.current = {
        latitude: ((await window.api.getStorageValue('latitude')) ??
          null) as number,
        longitude: ((await window.api.getStorageValue('longitude')) ??
          null) as number,
        temperatureUnit: ((await window.api.getStorageValue(
          'temperatureUnit'
        )) || 'celsius') as string,
        locationFormat: ((await window.api.getStorageValue(
          'locationFormat'
        )) || 'locality-city') as string,
        showTempUnit: ((await window.api.getStorageValue(
          'showTempUnit'
        )) ?? true) as boolean
      }
      setLoaded(true)
    }

    loadSettings()
  }, [])

  async function handleCoordinatesSubmit(
    latitude: string,
    longitude: string
  ) {
    setUpdate(true)
    setUpdateError(false)
    setUpdateMessage('')

    if (!latitude.trim() && !longitude.trim()) {
      await window.api.setStorageValue('latitude', null)
      await window.api.setStorageValue('longitude', null)

      try {
        const res = await window.api.updateWeather()
        if (!res) throw new Error('Failed to update weather')
        setUpdateMessage('Using IP geolocation to determine your location')
      } catch (error) {
        setUpdateError(true)
        setUpdateMessage(
          error instanceof Error ? error.message : 'Error updating weather'
        )
      } finally {
        setUpdate(false)
      }
      return
    }

    // Check if only one field is empty (which is invalid)
    if (
      (!latitude.trim() && longitude.trim()) ||
      (latitude.trim() && !longitude.trim())
    ) {
      setUpdateError(true)
      setUpdateMessage(
        'Please provide both latitude and longitude, or leave both empty for automatic detection'
      )
      setUpdate(false)
      return
    }

    const numLat = Number(latitude)
    const numLong = Number(longitude)

    // Check if values are valid numbers
    if (isNaN(numLat) || isNaN(numLong)) {
      setUpdateError(true)
      setUpdateMessage('Invalid coordinates, please enter numeric values')
      setUpdate(false)
      return
    }

    // Check if values are in valid range
    if (numLat < -90 || numLat > 90 || numLong < -180 || numLong > 180) {
      setUpdateError(true)
      setUpdateMessage(
        'Coordinates out of valid range: latitude must be between -90 and 90, longitude between -180 and 180'
      )
      setUpdate(false)
      return
    }

    await window.api.setStorageValue('latitude', numLat)
    await window.api.setStorageValue('longitude', numLong)
    try {
      const res = await window.api.updateWeather()
      if (!res) throw new Error('Failed to update weather')
      setUpdateMessage('Location updated successfully')
    } catch (error) {
      setUpdateError(true)
      setUpdateMessage(
        error instanceof Error ? error.message : 'Error updating weather'
      )
    } finally {
      setUpdate(false)
    }
  }

  return (
    loaded && (
      <div className={styles.settingsTab}>
        <CoordinatesInputSetting
          label="Location Coordinates"
          description="Enter latitude and longitude coordinates for weather information. Leave both fields empty to use ip address detection."
          latDefaultValue={settings.current.latitude?.toString()}
          longDefaultValue={settings.current.longitude?.toString()}
          onSubmit={handleCoordinatesSubmit}
          submitLabel="Update"
          disabled={update}
        />
        <SelectSetting
          label="Temperature Unit"
          description="Choose between Celsius and Fahrenheit for temperature display"
          defaultValue={settings.current.temperatureUnit}
          options={[
            { value: 'celsius', label: 'Celsius (°C)' },
            { value: 'fahrenheit', label: 'Fahrenheit (°F)' }
          ]}
          onChange={value => {
            window.api.setStorageValue('temperatureUnit', value as string)
            window.api.updateWeather()
          }}
        />
        <ToggleSetting
          label="Show Temperature Unit"
          description="Display the temperature unit (°C/°F) on the weather widget"
          defaultValue={settings.current.showTempUnit ?? true}
          onChange={value => {
            window.api.setStorageValue('showTempUnit', value)
          }}
        />
        <SelectSetting
          label="Location Format"
          description="Choose how location information is displayed"
          defaultValue={settings.current.locationFormat}
          options={[
            { value: 'none', label: 'No dispaly' },
            { value: 'city', label: 'City' },
            { value: 'city-locality', label: 'City, Locality' },
            { value: 'locality', label: 'Locality' },
            { value: 'locality-city', label: 'Locality, City' }
          ]}
          onChange={value => {
            window.api.setStorageValue('locationFormat', value as string)
            window.api.updateWeather()
          }}
        />
        {update && <Loader />}
        <div className={updateError ? styles.error : styles.success}>
          {updateMessage}
        </div>
      </div>
    )
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
        <img src={icon} alt="" />
        <div className={styles.info}>
          <h2>GlanceThing</h2>
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
