import { createRoot } from 'react-dom/client'

import { AppBlurContextProvider } from '@/contexts/AppBlurContext.tsx'
import { SocketContextProvider } from '@/contexts/SocketContext.tsx'
import { SleepContextProvider } from '@/contexts/SleepContext.tsx'
import { AppSettingsContextProvider } from '@/contexts/AppSettingsContext.tsx'
import { TimeContextProvider } from '@/contexts/TimeContext.tsx'
import { WeatherContextProvider } from '@/contexts/WeatherContext.tsx'

import App from '@/App.tsx'

import './index.css'
import '@fontsource-variable/open-sans'
import '@fontsource/material-icons'
import { MediaContextProvider } from './contexts/MediaContext.tsx'

const root = createRoot(document.getElementById('root')!)

root.render(
  <SocketContextProvider>
    <AppBlurContextProvider>
      <AppSettingsContextProvider>
        <TimeContextProvider>
          <WeatherContextProvider>
            <SleepContextProvider>
              <MediaContextProvider>
                <App />
              </MediaContextProvider>
            </SleepContextProvider>
          </WeatherContextProvider>
        </TimeContextProvider>
      </AppSettingsContextProvider>
    </AppBlurContextProvider>
  </SocketContextProvider>
)
