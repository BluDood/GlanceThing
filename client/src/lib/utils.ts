import axios from 'axios'

export function getClosestImage(
  covers: { url: string; width: number; height: number }[],
  width: number
) {
  const valid = covers.filter(cover => cover.width >= width)
  if (valid.length === 0) return covers[0]

  valid.sort((a, b) => a.width - b.width)

  return valid[0]
}

export async function getSocketPassword() {
  const res = await axios.get('./ws-password')
  return res.data.replace('\n', '')
}

export function formatTime(ms: number) {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  const remainingSeconds = seconds % 60

  if (hours > 0) {
    return `${hours}:${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return `${remainingMinutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

export const debouncedFunction = (callback: () => void, delay: number) => {
  let timeoutId: number | null = null

  const debouncedFn = () => {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId)
    }

    timeoutId = window.setTimeout(() => {
      callback()
      timeoutId = null
    }, delay)
  }

  debouncedFn.cancel = () => {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  return debouncedFn
}