import React, { useCallback, useContext, useEffect, useState, useRef } from 'react'
import { MediaContext } from '@/contexts/MediaContext.tsx'
import BaseWidget from '../BaseWidget/BaseWidget'

import styles from './Lyrics.module.css'

interface LyricsProps {
  visible: boolean
  sectionActive: boolean
}

const Lyrics: React.FC<LyricsProps> = ({ visible, sectionActive }) => {
  const { lyricsData, currentLineIndex } = useContext(MediaContext)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [hasLyrics, setHasLyrics] = useState<boolean>(false)
  const [syncLyric, setSyncLyric] = useState<boolean>(false)

  const lyricsContentRef = useRef<HTMLDivElement>(null)
  const activeLineRef = useRef<HTMLDivElement | null>(null)
  const [originalPrimary, setOriginalPrimary] = useState<string | null>(null)
  const [originalBgColor, setOriginalBgColor] = useState<string | null>(null)
  const [originalInactiveColor, setOriginalInactiveColor] = useState<string | null>(null)
  const [originalTextColor, setOriginalTextColor] = useState<string | null>(null)

  useEffect(() => {
    const computedStyle = getComputedStyle(document.documentElement)
    setOriginalPrimary(computedStyle.getPropertyValue('--color-primary'))
    setOriginalBgColor(computedStyle.getPropertyValue('--lyrics-color-background'))
    setOriginalInactiveColor(computedStyle.getPropertyValue('--lyrics-color-inactive'))
    setOriginalTextColor(computedStyle.getPropertyValue('--lyrics-color-messaging'))
  }, [])

  const scrollToActiveLine = useCallback(() => {
    if (!visible || !sectionActive || !activeLineRef.current || !lyricsContentRef.current) return
    const lyricsContainer = lyricsContentRef.current
    const activeLine = activeLineRef.current
    const containerHeight = lyricsContainer.clientHeight
    const lineTop = activeLine.offsetTop
    const lineHeight = activeLine.clientHeight
    const scrollTo = lineTop - (containerHeight / 2) + (lineHeight / 2)
    requestAnimationFrame(() => {
      if (lyricsContainer) {
        lyricsContainer.scrollTo({
          top: scrollTo,
          behavior: 'smooth'
        })
      }
    })
  }, [visible, sectionActive])

  useEffect(() => {
    if (visible && sectionActive && syncLyric) {
      requestAnimationFrame(() => {
        if (currentLineIndex >= 0) {
          scrollToActiveLine()
        }
        if (currentLineIndex === -1 && lyricsContentRef.current) {
          lyricsContentRef.current.scrollTo({
            top: 0,
            behavior: 'smooth'
          })
        }
      })
    }
  }, [currentLineIndex, scrollToActiveLine, visible, sectionActive, syncLyric])

  const setColors = useCallback((bgColor?: string, textColor?: string, inactiveColor?: string) => {
    document.documentElement.style.setProperty('--color-primary', bgColor ?? originalPrimary)
    document.documentElement.style.setProperty('--lyrics-color-background', bgColor ?? originalBgColor)
    document.documentElement.style.setProperty('--lyrics-color-active', textColor ?? originalTextColor)
    document.documentElement.style.setProperty('--lyrics-color-inactive', inactiveColor ?? originalInactiveColor)
    document.documentElement.style.setProperty('--lyrics-color-passed', textColor ?? originalTextColor)
    document.documentElement.style.setProperty('--lyrics-color-messaging', inactiveColor ?? originalTextColor)
  }, [originalPrimary, originalBgColor, originalInactiveColor, originalTextColor])

  useEffect(() => {
    setSyncLyric(false)
    if (lyricsData) {
      if (lyricsData?.lyrics?.syncType === "LINE_SYNCED") {
        setSyncLyric(true)
      }
      setLoading(false)
      setError(null)
      setHasLyrics(!!lyricsData?.lyrics?.lines && lyricsData.lyrics.lines.length > 0)

      if (lyricsData.colors?.background !== undefined) {
        try {
          const background = lyricsData.colors.background
          const r = background.r ?? 0
          const g = background.g ?? 0
          const b = background.b ?? 0
          const bgColor = `rgb(${r}, ${g}, ${b})`
          const brightness = (r * 299 + g * 587 + b * 114) / 1000
          const textColor = brightness > 128 ? "rgb(0, 0, 0)" : "rgb(255, 255, 255)"

          const inactiveColor = brightness > 128 ?
            `rgb(255, 255, 255)` :
            `rgb(${Math.min(255, background.r + 140)}, ${Math.min(255, background.g + 140)}, ${Math.min(255, background.b + 140)})`
          setColors(bgColor, textColor, inactiveColor)
        } catch (err) {
          console.error('Error setting background color:', err)
        }
      }

      if (lyricsData.message) {
        setColors()
        setError(lyricsData.message)
      }
    }
  }, [lyricsData, setColors])

  const renderLyrics = () => {
    if (!visible || !sectionActive || !hasLyrics || !lyricsData?.lyrics?.lines) {
      return <div className={styles.emptyLyrics}></div>
    }

    return (
      <div className={styles.lyricsContent} ref={lyricsContentRef}>
        <div className={styles.lyricsTopPadding} style={{ display: syncLyric ? 'block' : 'none' }}></div>
        {lyricsData.lyrics.lines.map((line, index) => (
          <div
            key={index}
            className={`${styles.line} ${index === currentLineIndex ? styles.activeLine : ''} ${index < currentLineIndex ? styles.passedLine : ''}`}
            ref={index === currentLineIndex ? activeLineRef : null}
          >
            {line.words}
          </div>
        ))}
        <div className={styles.lyricsBottomPadding} style={{ display: syncLyric ? 'block' : 'none' }}></div>
      </div>
    )
  }

  const renderContent = () => {
    if (!sectionActive) {
      return <div className={styles.loading}>Lyrics ready</div>
    }

    if (error) {
      return (
        <div className={styles.error}>
          <div className={styles.errorMessage}>{error}</div>
        </div>
      )
    }

    if (loading) {
      return <div className={styles.loading}>Loading lyrics...</div>
    }

    if (hasLyrics) {
      return (
        <div className={styles.lyricsContainer}>{renderLyrics()}</div>
      )
    }

    return <div className={styles.loading}>Waiting for track...</div>
  }

  return (
    <BaseWidget className={styles.lyricsWidget} visible={visible}>
      <div className={styles.lyricsWidgetContainer}>
        {renderContent()}
      </div>
    </BaseWidget>
  )
}

export default Lyrics