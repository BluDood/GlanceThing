import {
  createContext,
  useState,
  useEffect,
  useCallback,
  useContext,
  useRef
} from 'react'
import { SocketContext } from './SocketContext'

// Constants for date formatting
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WEEKDAYS_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
]
const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
]
const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
]

interface TimeContextValue {
  time: string
  date: string
}

const TimeContext = createContext<TimeContextValue>({
  time: '',
  date: ''
})

interface TimeProviderProps {
  children: React.ReactNode
}

const TimeContextProvider: React.FC<TimeProviderProps> = ({
  children
}) => {
  const { socket, ready } = useContext(SocketContext)

  const [time, setTime] = useState<string>('')
  const [date, setDate] = useState<string>('')

  const lastServerTime = useRef<Date | null>(null)
  const lastConnectionTime = useRef<number>(performance.now())
  const localTimeInterval = useRef<ReturnType<typeof setInterval> | null>(
    null
  )

  const getWeekdayName = useCallback(
    (day: number, useLongFormat: boolean = false): string => {
      return useLongFormat ? WEEKDAYS_LONG[day] : WEEKDAYS_SHORT[day]
    },
    []
  )

  const getMonthName = useCallback(
    (month: number, useLongFormat: boolean = false): string => {
      return useLongFormat ? MONTHS_LONG[month] : MONTHS_SHORT[month]
    },
    []
  )

  const getLongFormatFlag = useCallback((dateFormat: string): boolean => {
    return dateFormat === 'dddd, D MMMM'
  }, [])

  const formatDateTime = useCallback(
    (date: Date): { time: string; date: string } => {
      try {
        const timeFormat = localStorage.getItem('timeFormat') || 'HH:mm'
        const dateFormat =
          localStorage.getItem('dateFormat') || 'ddd, D MMM'
        const useLongNames = getLongFormatFlag(dateFormat)

        let timeString = ''
        if (timeFormat === 'HH:mm') {
          const hours = date.getHours().toString().padStart(2, '0')
          const minutes = date.getMinutes().toString().padStart(2, '0')
          timeString = `${hours}:${minutes}`
        } else {
          const hours = date.getHours()
          const minutes = date.getMinutes().toString().padStart(2, '0')
          const period = hours >= 12 ? 'PM' : 'AM'
          const displayHours = hours % 12 || 12
          timeString = `${displayHours}:${minutes} ${period}`
        }

        const day = date.getDate()
        const weekday = date.getDay()
        const month = date.getMonth()
        const weekdayName = getWeekdayName(weekday, useLongNames)
        const monthName = getMonthName(month, useLongNames)
        const dateString = `${weekdayName}, ${day} ${monthName}`

        return { time: timeString, date: dateString }
      } catch (e) {
        console.error('Error formatting date/time:', e)
        return { time: '', date: '' }
      }
    },
    [getWeekdayName, getMonthName, getLongFormatFlag]
  )

  const setTimeDate = (time?: string, date?: string) => {
    setTime(time ?? '')
    setDate(date ?? '')
  }

  const updateLocalTime = useCallback(() => {
    if (!lastServerTime.current) {
      setTimeDate()
      return
    }
    try {
      const msElapsed = performance.now() - lastConnectionTime.current
      const updatedTime = new Date(
        lastServerTime.current.getTime() + msElapsed
      )
      const formattedDateTime = formatDateTime(updatedTime)
      setTimeDate(formattedDateTime.time, formattedDateTime.date)
    } catch (error) {
      console.error('Error updating local time:', error)
      setTimeDate()
    }
  }, [formatDateTime])

  useEffect(() => {
    const startLocalTimeUpdates = () => {
      updateLocalTime()
      if (localTimeInterval.current) {
        clearInterval(localTimeInterval.current)
      }
      localTimeInterval.current = setInterval(() => {
        updateLocalTime()
      }, 1000)
    }

    if (!ready && lastServerTime.current) {
      startLocalTimeUpdates()
      return () => {
        if (localTimeInterval.current) {
          clearInterval(localTimeInterval.current)
          localTimeInterval.current = null
        }
      }
    }
    if (ready && localTimeInterval.current) {
      clearInterval(localTimeInterval.current)
      localTimeInterval.current = null
    }
  }, [ready, updateLocalTime])

  useEffect(() => {
    if (ready && socket) {
      const listener = (e: MessageEvent) => {
        try {
          const { type, data } = JSON.parse(e.data)
          if (type == 'time') {
            setTimeDate(data.time, data.date)
            lastServerTime.current = new Date(data.dateTime)
            lastConnectionTime.current = performance.now()
          }
        } catch (error) {
          console.error('Error processing server time message:', error)
        }
      }

      socket.addEventListener('message', listener)
      socket.send(JSON.stringify({ type: 'time' }))
      return () => {
        socket.removeEventListener('message', listener)
      }
    }
  }, [ready, socket])

  const value = {
    time,
    date
  }

  return (
    <TimeContext.Provider value={value}>{children}</TimeContext.Provider>
  )
}

export { TimeContext, TimeContextProvider }
