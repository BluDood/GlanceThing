import axios from 'axios'
import { AuthenticatedWebSocket } from '../types/WebSocketServer.js'
import { wss } from './server.js'
import { getStorageValue } from './storage.js'
import { log, LogLevel } from './utils.js'

export interface GeolocationResponse {
  latitude: number
  longitude: number
  city: string
  locality: string
  countryName: string
  countryCode: string
  lookupSource: string
}

export interface WeatherResponse {
  current: {
    time: string
    temperature_2m: number
    weather_code: number
    relative_humidity_2m: number
  }
  daily: {
    temperature_2m_max: number[]
    temperature_2m_min: number[]
  }
  current_units: {
    temperature_2m: string
  }
}

export async function fetchGeolocation(
  latitude?: number,
  longitude?: number
): Promise<GeolocationResponse | null> {
  let url = 'https://api-bdc.io/data/reverse-geocode-client'
  const params = new URLSearchParams()

  if (latitude !== undefined && longitude !== undefined) {
    params.append('latitude', latitude.toString())
    params.append('longitude', longitude.toString())
  }
  if (params.toString()) {
    url += '?' + params.toString()
  }
  try {
    const res = await axios.get(url)
    const data: GeolocationResponse = await res.data
    return data
  } catch (error) {
    log(
      `Fetch geolocation data error:${JSON.stringify(error)}`,
      'Weather',
      LogLevel.ERROR
    )
    return null
  }
}

export async function fetchWeather(
  latitude: number,
  longitude: number,
  unit?: string
) {
  let url = `https://api.open-meteo.com/v1/forecast`
  const params = new URLSearchParams()
  params.append(
    'current',
    'temperature_2m,weather_code,relative_humidity_2m'
  )
  params.append('forecast_days', '1')
  params.append('daily', 'temperature_2m_max,temperature_2m_min')
  params.append('timezone', 'auto')

  if (latitude !== undefined && longitude !== undefined) {
    params.append('latitude', latitude.toString())
    params.append('longitude', longitude.toString())
  }
  if (unit) {
    params.append('temperature_unit', unit)
  }
  if (params.toString()) {
    url += '?' + params.toString()
  }
  const weatherRes = await axios.get<WeatherResponse>(url)

  const data = weatherRes.data
  const times = data.current.time
  const temps = data.current.temperature_2m
  const codes = data.current.weather_code
  const humidity = data.current.relative_humidity_2m
  const temperatureUnit = data.current_units.temperature_2m
  const maxTemp = data.daily.temperature_2m_max[0]
  const minTemp = data.daily.temperature_2m_min[0]
  return {
    location: '',
    time: times,
    temperature: Math.round(temps),
    weatherCode: codes,
    humidity: humidity,
    temperatureUnit: temperatureUnit,
    maxTemperature: Math.round(maxTemp),
    minTemperature: Math.round(minTemp)
  }
}

export async function updateWeather(): Promise<boolean> {
  if (!wss) return false

  try {
    log('Update Weather', 'weather', LogLevel.DEBUG)
    let latitude = getStorageValue('latitude') as number | null
    let longitude = getStorageValue('longitude') as number | null
    const temperatureUnit =
      (getStorageValue('temperatureUnit') as string) || 'celsius'
    const locationFormat =
      (getStorageValue('locationFormat') as string) || 'locality-city'

    const hasValidCoordinates =
      typeof latitude === 'number' &&
      !isNaN(latitude) &&
      typeof longitude === 'number' &&
      !isNaN(longitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180

    if (!hasValidCoordinates) {
      log(
        'Coordinates not provided - using IP geolocation',
        'Weather',
        LogLevel.DEBUG
      )
      const ipGeolocation = await fetchGeolocation()

      if (
        !ipGeolocation ||
        typeof ipGeolocation.latitude !== 'number' ||
        typeof ipGeolocation.longitude !== 'number'
      ) {
        throw new Error(
          'Could not obtain valid coordinates for weather update'
        )
      }
      latitude = ipGeolocation.latitude
      longitude = ipGeolocation.longitude
    }
    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      isNaN(latitude) ||
      isNaN(longitude)
    ) {
      throw new Error(
        'Could not obtain valid coordinates for weather update'
      )
    }

    const data = await fetchWeather(latitude, longitude, temperatureUnit)
    if (!data) {
      throw new Error('Failed to fetch weather data')
    }

    const geolocation = await fetchGeolocation(latitude, longitude)
    let location = ''
    if (geolocation) {
      switch (locationFormat) {
        case 'city':
          location = geolocation.city ?? ''
          break
        case 'locality':
          location = geolocation.locality ?? ''
          break
        case 'city-locality':
          location =
            geolocation.city && geolocation.locality
              ? `${geolocation.city}, ${geolocation.locality}`
              : ''
          break
        case 'locality-city':
          location =
            geolocation.city && geolocation.locality
              ? `${geolocation.locality}, ${geolocation.city}`
              : ''
        default:
          break
      }
    }
    data.location = location
    log(`Weather data:${JSON.stringify(data)}`, 'Weather', LogLevel.DEBUG)
    const message = JSON.stringify({
      type: 'weather',
      data
    })

    wss.clients.forEach((ws: AuthenticatedWebSocket) => {
      if (ws.authenticated && ws.readyState === 1) {
        ws.send(message)
      }
    })

    return true
  } catch (error) {
    log(
      `Fetch weather data error:${JSON.stringify(error)}`,
      'Weather',
      LogLevel.ERROR
    )
    return false
  }
}
