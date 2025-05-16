import { useContext } from 'react'
import BaseWidget from '../BaseWidget/BaseWidget.tsx'
import styles from './Time.module.css'
import { TimeContext } from '@/contexts/TimeContext.tsx'

interface TimeProps {
  visible: boolean
}

const Time: React.FC<TimeProps> = ({ visible }) => {
  const { time, date } = useContext(TimeContext)

  return (
    <BaseWidget className={styles.timedate} visible={visible}>
      <div className={styles.time}>{time}</div>
      <div className={styles.date}>{date}</div>
    </BaseWidget>
  )
}

export default Time
