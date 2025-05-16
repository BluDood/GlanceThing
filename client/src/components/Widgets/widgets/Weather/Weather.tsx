import { useContext } from 'react'
import { WeatherContext } from '@/contexts/WeatherContext.tsx'
import BaseWidget from '../BaseWidget/BaseWidget.tsx'

import styles from './Weather.module.css'

interface WeatherProps {
  visible: boolean
}

const Weather: React.FC<WeatherProps> = ({ visible }) => {
  const {
    weather,
    loading,
    error,
    refreshWeather,
    weatherEmoji,
    weatherDescription,
    temperatureUnit
  } = useContext(WeatherContext)

  return (
    <BaseWidget
      className={styles.weather}
      visible={visible}
      onClick={refreshWeather}
    >
      {weather ? (
        <div className={styles.container}>
          <div className={styles.location}>{weather.location}</div>
          <div className={styles.row}>
            <div className={styles.temp}>
              {weather.temperature}°{temperatureUnit}
            </div>
            <div className={styles.icon}>{weatherEmoji}</div>
          </div>
          <div className={styles.description}>{weatherDescription}</div>
          <div className={styles.condition}>
            <span>💧{weather.humidity}%</span>
            <span>
              📈{weather.maxTemperature}°{temperatureUnit}
            </span>
            <span>
              📉{weather.minTemperature}°{temperatureUnit}
            </span>
          </div>
        </div>
      ) : error ? (
        <div className={styles.error}>
          <div>Unable to get weather data</div>
          <button className={styles.retryButton} onClick={refreshWeather}>
            Retry
          </button>
        </div>
      ) : loading ? (
        <div className={styles.loading}>Loading weather data...</div>
      ) : (
        <div className={styles.loading}>Waiting for weather data...</div>
      )}
    </BaseWidget>
  )
}

export default Weather
