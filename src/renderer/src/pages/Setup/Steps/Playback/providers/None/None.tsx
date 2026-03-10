import React from 'react'
import styles from './None.module.css'

interface NoneProps {
  onStepComplete: () => void
}

const None: React.FC<NoneProps> = ({ onStepComplete }) => {
  return (
    <div className={styles.none}>
      <p>This will simply disable media feedback on GlanceThing.</p>
      <div className={styles.buttons}>
        <button onClick={onStepComplete}>Continue</button>
      </div>
    </div>
  )
}

export default None
