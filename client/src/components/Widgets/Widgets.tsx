import { useContext, useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { AppSettingsContext } from '@/contexts/AppSettingsContext.tsx'
import { MediaContext } from '@/contexts/MediaContext.tsx'
import { debouncedFunction } from '@/lib/utils.ts'

import Controls from './widgets/Controls/Controls.tsx'
import Player from './widgets/Player/Player.tsx'
import Apps from './widgets/Apps/Apps.tsx'
import Time from './widgets/Time/Time.tsx'
import Weather from './widgets/Weather/Weather.tsx'
import Lyrics from './widgets/Lyrics/Lyrics.tsx'

import styles from './Widgets.module.css'

interface SectionContent {
  components: React.ReactNode[]
}

const Widgets: React.FC = () => {
  const {
    showTimeWidget,
    showWeatherWidget,
    showAppsWidget,
    showControlsWidget,
    showLyricsWidget,
    showStatusBar,
    autoSwitchToLyrics
  } = useContext(AppSettingsContext)
  const { playerData, lyricsData } = useContext(MediaContext)
  const widgetsRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [timeVisible, setTimeVisible] = useState(false)
  const [weatherVisible, setWeatherVisible] = useState(false)
  const [appsVisible, setAppsVisible] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(false)
  const [lyricsVisible, setLyricsVisible] = useState(false)
  const [activeSection, setActiveSection] = useState(1)
  const [isUserScrolling, setIsUserScrolling] = useState(false)
  const [isUserScrolled, setIsUserScrolled] = useState(false)
  const userScrollingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null)

  const markUserInteracting = useCallback(() => {
    setIsUserScrolling(true)
    setIsUserScrolled(true)

    if (userScrollingTimer.current) {
      clearTimeout(userScrollingTimer.current)
    }

    userScrollingTimer.current = setTimeout(() => {
      setIsUserScrolling(false)
      userScrollingTimer.current = null
    }, 2000)
  }, [])

  const handlePaginationClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    markUserInteracting()

    const target = e.target as HTMLElement
    const indexStr = target.getAttribute('data-index')
    if (indexStr) {
      const index = parseInt(indexStr, 10)
      if (index !== activeSection - 1) {
        setActiveSection(index + 1)

        setTimeout(() => {
          if (scrollRef.current) {
            const sectionWidth = scrollRef.current.clientWidth
            scrollRef.current.scrollTo({
              left: index * sectionWidth,
              behavior: 'smooth'
            })
          }
        }, 0)
      }
    }
  }, [activeSection, markUserInteracting])

  const updateActiveSection = useCallback(() => {
    if (!scrollRef.current) return

    const scrollPosition = scrollRef.current.scrollLeft
    const sectionWidth = scrollRef.current.clientWidth
    const sectionIndex = Math.round(scrollPosition / sectionWidth) + 1

    if (sectionIndex !== activeSection) {
      setActiveSection(sectionIndex)
    }
  }, [activeSection])

  const sectionsList = useMemo(() => {
    const list: SectionContent[] = []
    if (timeVisible || weatherVisible) {
      list.push({
        components: [
          <Time key="time" visible={timeVisible} />,
          <Weather key="weather" visible={weatherVisible} />
        ]
      })
    }
    if (appsVisible || controlsVisible) {
      list.push({
        components: [
          <Apps key="apps" visible={appsVisible} />,
          <Controls key="controls" visible={controlsVisible} />
        ]
      })
    }
    if (lyricsVisible) {
      list.push({
        components: [
          <Lyrics key="lyrics" visible={lyricsVisible} sectionActive={false} />
        ]
      })
    }
    return list
  }, [timeVisible, weatherVisible, appsVisible, controlsVisible, lyricsVisible])

  const sections = useMemo(() => {
    return sectionsList.map((section, index) => {
      if (index === sectionsList.length - 1 && lyricsVisible) {
        return {
          ...section,
          components: [
            <Lyrics
              key="lyrics"
              visible={lyricsVisible}
              sectionActive={activeSection === index + 1}
            />
          ]
        }
      }
      return section
    })
  }, [sectionsList, lyricsVisible, activeSection])

  const widgetsPanelVisible = useMemo(() => sections.length > 0, [sections.length])

  useEffect(() => {
    setTimeVisible(showTimeWidget)
    setWeatherVisible(showWeatherWidget)
    setAppsVisible(showAppsWidget)
    setControlsVisible(showControlsWidget)
    setLyricsVisible(showLyricsWidget)
  }, [showTimeWidget, showWeatherWidget, showAppsWidget, showControlsWidget, showLyricsWidget])

  const navigateToSection = useCallback((sectionIndex: number) => {
    console.log(`Navigating to section ${sectionIndex + 1}, current: ${activeSection}`)

    setActiveSection(sectionIndex + 1)

    setTimeout(() => {
      if (!scrollRef.current) {
        console.log('Scroll ref is null')
        return
      }

      const sectionWidth = scrollRef.current.clientWidth
      console.log(`Scrolling to ${sectionIndex * sectionWidth}px`)

      scrollRef.current.scrollTo({
        left: sectionIndex * sectionWidth,
        behavior: 'smooth'
      })

      setTimeout(() => {
        const sectionElement = document.getElementById(`section-${sectionIndex + 1}`)
        if (sectionElement) {
          const firstSectionWidget = sectionElement.querySelector('#widget') as HTMLDivElement
          if (firstSectionWidget) firstSectionWidget.focus()
        } else {
          console.log(`Couldn't find section-${sectionIndex + 1}`)
        }
      }, 100)
    }, 10)
  }, [activeSection])

  useEffect(() => {
    if (activeSection > sections.length) {
      setActiveSection(Math.max(1, sections.length))
    }
  }, [sections.length, activeSection])

  const lyricsIndex = useMemo(() => {
    if (!lyricsVisible) return -1
    return sections.findIndex((_, index) => {
      return index === sections.length - 1 && lyricsVisible
    })
  }, [sections, lyricsVisible])

  const canSwitchToLyrics = useCallback(() => {
    const hasLyrics = lyricsData?.lyrics?.lines && lyricsData.lyrics?.lines?.length > 0
    if (
      !autoSwitchToLyrics ||
      !lyricsVisible ||
      lyricsIndex === -1 ||
      isUserScrolling ||
      !hasLyrics ||
      activeSection === lyricsIndex + 1
    ) {
      return false
    }
    return true
  }, [
    autoSwitchToLyrics,
    lyricsVisible,
    lyricsIndex,
    isUserScrolling,
    lyricsData,
    activeSection
  ])

  useEffect(() => {
    if (!playerData?.track) return

    const trackId = `${playerData.track.name}-${playerData.track.artists.join(',')}`
    const trackChanged = trackId !== currentTrackId

    if (trackChanged) {
      setCurrentTrackId(trackId)
      setIsUserScrolled(false)
    }

    const shouldSwitch = canSwitchToLyrics()

    if (shouldSwitch) {
      if ((trackChanged && !isUserScrolled) || (!isUserScrolled && playerData.isPlaying)) {
        console.log(`Auto-switching to lyrics section (${lyricsIndex})`)

        const switchTimeout = setTimeout(() => {
          navigateToSection(lyricsIndex)
        }, 1000)

        return () => clearTimeout(switchTimeout)
      }
    }
  }, [
    playerData,
    currentTrackId,
    canSwitchToLyrics,
    isUserScrolled,
    navigateToSection,
    lyricsIndex
  ])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!widgetsRef.current) return

      markUserInteracting()

      const keyNum = parseInt(e.key)
      if (!isNaN(keyNum) && keyNum > 0 && keyNum <= 4) {
        const allWidgets = widgetsRef.current.querySelectorAll('#widget')
        if (keyNum === 1) {
          const playerWidget = allWidgets[0] as HTMLDivElement
          if (playerWidget) playerWidget.focus()
        }
        else if (keyNum >= 2 && keyNum <= 4) {
          const sectionIndex = keyNum - 2

          if (sectionIndex < sections.length) {
            navigateToSection(sectionIndex)
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [sections.length, navigateToSection, markUserInteracting])

  useEffect(() => {
    const scrollElement = scrollRef.current
    if (!scrollElement) return

    const sectionWidth = scrollElement.clientWidth

    updateActiveSection()

    const debouncedUpdate = debouncedFunction(() => {
      if (!scrollElement) return

      const scrollPosition = scrollElement.scrollLeft
      const newSectionIndex = Math.round(scrollPosition / sectionWidth) + 1

      if (newSectionIndex !== activeSection) {
        setActiveSection(newSectionIndex)
      }
    }, 30)

    const handleScroll = () => {
      markUserInteracting()
      debouncedUpdate()
    }

    scrollElement.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      scrollElement.removeEventListener('scroll', handleScroll)
      debouncedUpdate.cancel()
    }
  }, [activeSection, sections.length, updateActiveSection, markUserInteracting])

  useEffect(() => {
    if (activeSection > sections.length && sections.length > 0) {
      setActiveSection(1)
    }
    if (scrollRef.current && sections.length > 0) {
      setTimeout(updateActiveSection, 0)
    }
  }, [sections.length, activeSection, updateActiveSection])

  useEffect(() => {
    return () => {
      if (userScrollingTimer.current) {
        clearTimeout(userScrollingTimer.current)
      }
    }
  }, [])

  return (
    <div
      className={`${styles.widgets} ${showStatusBar ? styles.withStatusBar : ''}`}
      ref={widgetsRef}>
      <div className={`${styles.player} ${widgetsPanelVisible ? styles.withWidgetsPanel : ''}`}>
        <Player />
      </div>
      {widgetsPanelVisible && (
        <div className={styles.widgetsPanel}>
          <div className={styles.scroll} ref={scrollRef}>
            {sections.map((section, index) => (
              <div key={`section-${index + 1}`} className={styles.column} id={`section-${index + 1}`}>
                {section.components.map((component) => (
                  component
                ))}
              </div>
            ))}
          </div>
          {sections.length > 1 && (
            <div
              className={styles.pagination}
              onClick={handlePaginationClick}>
              {sections.map((_, index) => {
                const isActive = activeSection === index + 1
                return (
                  <div
                    key={`pagination-${index + 1}`}
                    data-index={index.toString()}
                    className={`${styles.pageBtn} ${isActive ? styles.active : ''}`}
                    role="button"
                  ></div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Widgets