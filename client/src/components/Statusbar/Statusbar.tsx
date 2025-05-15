import { useContext } from 'react'
import { TimeContext } from '@/contexts/TimeContext'
import { WeatherContext } from '@/contexts/WeatherContext'
import { AppSettingsContext } from '@/contexts/AppSettingsContext'
import styles from './Statusbar.module.css'

const Statusbar: React.FC = () => {
  const { time, date } = useContext(TimeContext)
  const { weather ,weatherEmoji, temperatureUnit } = useContext(WeatherContext)
  const { showTimeInStatusBar, showWeatherInStatusBar } = useContext(AppSettingsContext)

  return (
    <div className={styles.statusbar}>
      {showTimeInStatusBar && (
        <div className={styles.timedate}>
          <div className={styles.time}>{time}</div>
          <div className={styles.date}>{date}</div>
        </div>
      )}
      {showWeatherInStatusBar && weather && (
        <div className={styles.weather}>
          <div className={styles.weatherIcon}>
            {weatherEmoji}
          </div>
          <div className={styles.temperature}>
            {weather.temperature}°{temperatureUnit}
          </div>
          <div className={styles.minMax}>
            <span className={styles.tempMax}>↑{weather.maxTemperature}°</span>
            <span className={styles.tempMin}>↓{weather.minTemperature}°</span>
          </div>
        </div>
      )}
      {!showTimeInStatusBar && !showWeatherInStatusBar && (
        <div className={styles.empty}></div>
      )}
    </div>
  )
}

export default Statusbar