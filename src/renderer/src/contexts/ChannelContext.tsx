import { createContext, useEffect, useState } from 'react'

interface ChannelContextType {
  channel: 'stable' | 'nightly' | null
}

const ChannelContext = createContext<ChannelContextType>({
  channel: null
})

interface ChannelContextProviderProps {
  children: React.ReactNode
}

const ChannelContextProvider = ({
  children
}: ChannelContextProviderProps) => {
  const [channel, setChannel] = useState<'stable' | 'nightly' | null>(null)

  useEffect(() => {
    window.api.getChannel().then(setChannel)
  }, [])

  return (
    <ChannelContext.Provider
      value={{
        channel
      }}
    >
      {children}
    </ChannelContext.Provider>
  )
}

export { ChannelContext, ChannelContextProvider }
