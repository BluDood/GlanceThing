interface WeatherInfo {
  description: string
  emoji: string
}

const weatherCodeMap: Record<number, WeatherInfo> = {
  0: { description: 'Clear sky', emoji: '☀️' },
  1: { description: 'Mainly clear', emoji: '🌤️' },
  2: { description: 'Partly cloudy', emoji: '⛅' },
  3: { description: 'Overcast', emoji: '☁️' },
  45: { description: 'Fog', emoji: '🌫️' },
  48: { description: 'Rime fog', emoji: '🌫️❄️' },
  51: { description: 'Light drizzle', emoji: '🌦️' },
  53: { description: 'Moderate drizzle', emoji: '🌧️' },
  55: { description: 'Dense drizzle', emoji: '🌧️' },
  56: { description: 'Freezing drizzle', emoji: '🌧️❄️' },
  57: { description: 'Freezing dense drizzle', emoji: '🌧️❄️' },
  61: { description: 'Slight rain', emoji: '🌦️' },
  63: { description: 'Moderate rain', emoji: '🌧️' },
  65: { description: 'Heavy rain', emoji: '🌧️💧' },
  66: { description: 'Freezing light rain', emoji: '🌧️❄️' },
  67: { description: 'Freezing heavy rain', emoji: '🌧️❄️' },
  71: { description: 'Slight snow', emoji: '🌨️' },
  73: { description: 'Moderate snow', emoji: '❄️' },
  75: { description: 'Heavy snow', emoji: '❄️❄️' },
  77: { description: 'Snow grains', emoji: '🌨️' },
  80: { description: 'Rain showers', emoji: '🌦️' },
  81: { description: 'Moderate showers', emoji: '🌧️' },
  82: { description: 'Violent rain showers', emoji: '⛈️' },
  85: { description: 'Light snow showers', emoji: '🌨️' },
  86: { description: 'Heavy snow showers', emoji: '❄️❄️' },
  95: { description: 'Thunderstorm', emoji: '⛈️' },
  96: { description: 'Thunderstorm with hail', emoji: '⛈️🌨️' },
  99: { description: 'Severe thunderstorm with hail', emoji: '🌩️🌨️' }
}

export function getWeatherDescription(code: number): string {
  const entry = weatherCodeMap[code]
  return entry ? `${entry.description}` : ''
}

export function getWeatherEmoji(code: number): string {
  const entry = weatherCodeMap[code]
  return entry ? `${entry.emoji}` : ''
}
