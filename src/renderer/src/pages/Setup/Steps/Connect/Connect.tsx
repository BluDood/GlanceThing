import React, { useEffect, useState } from 'react'

import Loader from '@/components/Loader/Loader.js'

import styles from './Connect.module.css'

interface ConnectProps {
  onStepComplete: () => void
}

enum State {
  Pending,
  Starting,
  Started
}

const Connect: React.FC<ConnectProps> = ({ onStepComplete }) => {
  const [state, setState] = useState<State>(0)

  async function install() {
    setState(State.Starting)
    await window.api.startServer()
    setState(State.Started)
  }

  useEffect(() => {
    window.api.getServerInfo().then(info => {
      if (info.running) setState(State.Started)
    })
  }, [])

  return (
    <div className={styles.connect}>
      <p className={styles.step}>Step 4</p>
      <h1>Start the server</h1>
      <p>
        You should now see a welcome screen on the CarThing. Start the
        internal server and start enjoying your GlanceThing!
      </p>
      {state === State.Starting ? (
        <div className={styles.state} key={'installing'}>
          <Loader />
          <p>Starting...</p>
        </div>
      ) : state === State.Started ? (
        <div className={styles.state} key={'complete'}>
          <span className="material-icons">check_circle</span>
          <p>Started!</p>
        </div>
      ) : null}
      <div className={styles.buttons}>
        {state === State.Pending ? (
          <button onClick={install}>Start</button>
        ) : state === State.Started ? (
          <button onClick={onStepComplete}>Continue</button>
        ) : null}
      </div>
    </div>
  )
}

export default Connect
