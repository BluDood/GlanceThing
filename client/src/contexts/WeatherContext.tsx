import {
  createContext,
  useState,
  useEffect,
  useCallback,
  useContext
} from 'react'
import { SocketContext } from './SocketContext'
import { AppSettingsContext } from './AppSettingsContext'
import { getWeatherEmoji, getWeatherDescription } from '@/lib/weatherCodes'

interface WeatherData {
  location: string
  time: string
  temperature: number
  temperatureUnit: string
  weatherCode: number
  humidity: number
  maxTemperature: number
  minTemperature: number
}

interface WeatherContextValue {
  weather: WeatherData | null
  loading: boolean
  error: boolean
  weatherEmoji: string
  weatherDescription: string
  temperatureUnit: string
  refreshWeather: () => void
}

const WeatherContext = createContext<WeatherContextValue>({
  weather: null,
  loading: true,
  error: false,
  weatherEmoji: '',
  weatherDescription: '',
  temperatureUnit: '',
  refreshWeather: () => {}
})

interface WeatherProviderProps {
  children: React.ReactNode
}

const WeatherContextProvider: React.FC<WeatherProviderProps> = ({
  children
}) => {
  const { ready, socket } = useContext(SocketContext)
  const { showTempUnit } = useContext(AppSettingsContext)

  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [weatherEmoji, setWeatherEmoji] = useState<string>('')
  const [weatherDescription, setWeatherDescription] = useState<string>('')
  const [temperatureUnit, setTemperatureUnit] = useState<string>('')

  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<boolean>(false)

  const refreshWeather = useCallback(() => {
    if (ready && socket) {
      setLoading(true)
      socket.send(JSON.stringify({ type: 'weather', action: 'refresh' }))
    }
  }, [ready, socket])

  useEffect(() => {
    if (ready && socket) {
      const listener = (e: MessageEvent) => {
        try {
          const { type, data } = JSON.parse(e.data)
          if (type === 'weather') {
            setLoading(false)
            if (data) {
              setWeather(data)
              setWeatherEmoji(getWeatherEmoji(data.weatherCode))
              setWeatherDescription(
                getWeatherDescription(data.weatherCode)
              )
              if (showTempUnit) {
                setTemperatureUnit(
                  data.temperatureUnit === 'fahrenheit' ? 'F' : 'C'
                )
              }
              setError(false)
            }
          }
        } catch (error) {
          console.error('Error processing server time message:', error)
        }
      }

      socket.addEventListener('message', listener)
      socket.send(JSON.stringify({ type: 'weather', action: 'refresh' }))
      return () => {
        socket.removeEventListener('message', listener)
      }
    }
  }, [ready, socket, showTempUnit])

  const value = {
    weather,
    loading,
    error,
    weatherEmoji,
    weatherDescription,
    temperatureUnit,
    refreshWeather
  }

  return (
    <WeatherContext.Provider value={value}>
      {children}
    </WeatherContext.Provider>
  )
}

export { WeatherContext, WeatherContextProvider }
