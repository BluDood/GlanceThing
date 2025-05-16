import React, { useEffect, useRef, useState } from 'react'
import styles from './Spotify.module.css'
import Loader from '@/components/Loader/Loader.js'

interface SpotifyProps {
  onStepComplete: () => void
}

enum SpotifyStep {
  API,
  Token
}

const Spotify: React.FC<SpotifyProps> = ({ onStepComplete }) => {
  const [step, setStep] = useState<SpotifyStep>(0)
  const credentialsRef = useRef<{
    clientId: string
    clientSecret: string
    refreshToken: string
  } | null>(null)
  const [hasSetup, setHasSetup] = useState(false)

  useEffect(() => {
    window.api.getPlaybackHandlerConfig('spotify').then(data => {
      if (data) setHasSetup(true)
    })
  }, [])

  return (
    <div className={styles.spotify}>
      {step === SpotifyStep.API ? (
        <SpotifyAPISetup
          onStepComplete={data => {
            setStep(SpotifyStep.Token)
            credentialsRef.current = data
          }}
          onStepSkip={() => {
            setStep(SpotifyStep.Token)
          }}
        />
      ) : step === SpotifyStep.Token ? (
        <TokenSetup
          onStepComplete={data => {
            if (credentialsRef.current) {
              window.api.setPlaybackHandlerConfig('spotify', {
                ...credentialsRef.current,
                ...data
              })
              onStepComplete()
            }
          }}
          onStepSkip={() => {
            onStepComplete()
          }}
        />
      ) : null}
      <div className={styles.hasSetup} data-shown={hasSetup}>
        <span className="material-icons">check_circle</span>
        <h2>Spotify is already set up!</h2>
        <p>You can choose to set it up again or skip this step.</p>
        <div className={styles.actions}>
          <button onClick={() => setHasSetup(false)}>Set up again</button>
          <button onClick={onStepComplete}>Continue</button>
        </div>
      </div>
    </div>
  )
}

interface SpotifyAPISetupProps {
  onStepComplete: (data: {
    clientId: string
    clientSecret: string
    refreshToken: string
  }) => void
  onStepSkip: () => void
}

enum SpotifyAPISetupState {
  Pending,
  Checking,
  Valid,
  Invalid,
  Error
}

const SpotifyAPISetup: React.FC<SpotifyAPISetupProps> = ({
  onStepComplete,
  onStepSkip
}) => {
  const [state, setState] = useState<SpotifyAPISetupState>(0)
  const [error, setError] = useState<string>('')
  const idRef = useRef<HTMLInputElement | null>(null)
  const secretRef = useRef<HTMLInputElement | null>(null)
  const tokenRef = useRef<HTMLInputElement | null>(null)

  async function check() {
    const clientId = idRef.current!.value
    const clientSecret = secretRef.current!.value
    const refreshToken = tokenRef.current!.value

    setError('')
    setState(SpotifyAPISetupState.Checking)
    const valid = await window.api.validateConfig('spotify', {
      clientId,
      clientSecret,
      refreshToken
    })
    if (valid) {
      setState(SpotifyAPISetupState.Valid)
    } else {
      setError('Invalid credentials! Please try again.')
      setState(SpotifyAPISetupState.Invalid)
    }
  }

  function complete() {
    const clientId = idRef.current!.value
    const clientSecret = secretRef.current!.value
    const refreshToken = tokenRef.current!.value
    onStepComplete({ clientId, clientSecret, refreshToken })
  }

  function skip() {
    onStepSkip()
  }

  return (
    <div className={styles.step}>
      <h2>Step 1: Spotify API Setup</h2>
      <p>
        For controlling your Spotify playback on GlanceThing, you&apos;ll
        need to set up a Spotify application.
      </p>
      <p>
        To do this, you can use{' '}
        <a
          href="https://spotirt.bludood.com/"
          target="_blank"
          rel="noreferrer"
        >
          SpotiRT
        </a>{' '}
        to easily generate a refresh token.
      </p>
      <p>
        Make sure to select{' '}
        <code>Read access to a user&apos;s player state</code> and{' '}
        <code>Write access to a user&apos;s player state</code> as the
        scope.
      </p>

      <div className={styles.inputs}>
        <input
          type="text"
          className={styles.input}
          placeholder="Client ID"
          ref={idRef}
        />
        <input
          type="password"
          className={styles.input}
          placeholder="Client Secret"
          ref={secretRef}
        />
        <input
          type="password"
          className={styles.input}
          placeholder="Refresh Token"
          ref={tokenRef}
        />
      </div>
      {state === SpotifyAPISetupState.Checking ? (
        <div className={styles.state} data-small="true" key={'checking'}>
          <Loader />
          <p>Checking...</p>
        </div>
      ) : state === SpotifyAPISetupState.Valid ? (
        <div className={styles.state} data-small="true" key={'valid'}>
          <span className="material-icons">check_circle</span>
          <p>Valid!</p>
        </div>
      ) : state === SpotifyAPISetupState.Invalid ? (
        <div className={styles.state} data-small="true" key={'invalid'}>
          <span className="material-icons" data-type="error">
            error
          </span>
          <p>{error ?? 'Invalid token!'}</p>
        </div>
      ) : state === SpotifyAPISetupState.Error ? (
        <div className={styles.state} data-small="true" key={'error'}>
          <span className="material-icons" data-type="error">
            error
          </span>
          <p>{error}</p>
        </div>
      ) : null}
      <div className={styles.buttons}>
        <button onClick={skip}>Skip</button>
        {[
          SpotifyAPISetupState.Pending,
          SpotifyAPISetupState.Error,
          SpotifyAPISetupState.Invalid
        ].includes(state) ? (
          <button onClick={check}>Check</button>
        ) : [SpotifyAPISetupState.Valid].includes(state) ? (
          <button onClick={complete}>Continue</button>
        ) : null}
      </div>
    </div>
  )
}

interface TokenSetupProps {
  onStepComplete: (data: { sp_dc: string }) => void
  onStepSkip: () => void
}

enum TokenSetupState {
  Pending,
  Checking,
  Valid,
  Invalid,
  Error
}

const TokenSetup: React.FC<TokenSetupProps> = ({
  onStepComplete,
  onStepSkip
}) => {
  const [state, setState] = useState<TokenSetupState>(0)
  const [error, setError] = useState<string>('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  async function check() {
    const token = inputRef.current!.value
    setError('')
    setState(TokenSetupState.Checking)
    await new Promise(r => setTimeout(r, 0))
    if (!validate(token)) return
    const valid = await window.api.validateConfig('spotify', {
      sp_dc: token
    })
    if (valid) {
      setState(TokenSetupState.Valid)
    } else {
      setError('Invalid token! Please try again.')
      setState(TokenSetupState.Invalid)
    }
  }

  function complete() {
    const token = inputRef.current!.value
    onStepComplete({ sp_dc: token })
  }

  function skip() {
    onStepSkip()
  }

  function validate(token: string) {
    if (token.length === 0) {
      setError('Token cannot be empty!')
      setState(TokenSetupState.Invalid)
      return false
    } else if (
      token.includes('sp_dc') ||
      token.includes('"') ||
      token.includes("'")
    ) {
      setError('Only paste the token here, without sp_dc or quotes!')
      setState(TokenSetupState.Invalid)
      return false
    } else if (!/^[A-Za-z0-9-_]+$/.test(token)) {
      setError('Invalid token format! Please check your input.')
      setState(TokenSetupState.Invalid)
      return false
    }
    return true
  }

  return (
    <div className={styles.step}>
      <h2>Step 2: Spotify Web Token Setup</h2>
      <p>
        To enable realtime playback updates, GlanceThing needs an extra
        token you can get from the Spotify Web Player.
      </p>
      <p>
        Follow the steps in{' '}
        <a
          href="https://github.com/BluDood/GlanceThing/wiki/Getting-your-Spotify-token"
          target="_blank"
          rel="noreferrer"
        >
          this guide
        </a>{' '}
        to get the token.
      </p>
      <div className={styles.inputs}>
        <input
          ref={inputRef}
          disabled={[
            TokenSetupState.Checking,
            TokenSetupState.Valid
          ].includes(state)}
          type="password"
          placeholder="sp_dc token"
          className={styles.input}
        />
      </div>
      {state === TokenSetupState.Checking ? (
        <div className={styles.state} key={'checking'}>
          <Loader />
          <p>Checking...</p>
        </div>
      ) : state === TokenSetupState.Valid ? (
        <div className={styles.state} key={'valid'}>
          <span className="material-icons">check_circle</span>
          <p>Valid!</p>
        </div>
      ) : state === TokenSetupState.Invalid ? (
        <div className={styles.state} key={'invalid'}>
          <span className="material-icons" data-type="error">
            error
          </span>
          <p>{error ?? 'Invalid token!'}</p>
        </div>
      ) : state === TokenSetupState.Error ? (
        <div className={styles.state} key={'error'}>
          <span className="material-icons" data-type="error">
            error
          </span>
          <p>{error}</p>
        </div>
      ) : null}
      <div className={styles.buttons}>
        <button onClick={skip}>Skip</button>
        {[
          TokenSetupState.Pending,
          TokenSetupState.Error,
          TokenSetupState.Invalid
        ].includes(state) ? (
          <button
            onClick={check}
            disabled={state === TokenSetupState.Checking}
            data-hidden={state === TokenSetupState.Valid}
          >
            Check
          </button>
        ) : [TokenSetupState.Valid].includes(state) ? (
          <button onClick={complete}>Continue</button>
        ) : null}
      </div>
    </div>
  )
}

export default Spotify
