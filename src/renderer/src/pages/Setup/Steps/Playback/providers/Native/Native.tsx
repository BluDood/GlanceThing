import React from 'react'
import styles from './Native.module.css'

interface NativeProps {
  onStepComplete: () => void
}

const Native: React.FC<NativeProps> = ({ onStepComplete }) => {
  return (
    <div className={styles.native}>
      <p>
        This will use your operating system&apos;s playback service to
        provide updates and controls.
      </p>
      <div className={styles.buttons}>
        <button onClick={onStepComplete}>Continue</button>
      </div>
    </div>
  )
}

export default Native
