import { createContext, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

interface ModalContextType {
  openModals: string[]
  setModalOpen: (modalName: string, value: boolean) => void
}

const ModalContext = createContext<ModalContextType>({
  openModals: [],
  setModalOpen: () => {}
})

interface ModalContextProviderProps {
  children: React.ReactNode
}

const ModalContextProvider = ({ children }: ModalContextProviderProps) => {
  const location = useLocation()
  const [openModals, setOpenModals] = useState<string[]>([])

  const setModalOpen = (modalName: string, value: boolean) => {
    setOpenModals(prev => {
      if (value) return [modalName]
      else return prev.filter(modal => modal !== modalName)
    })
  }

  useEffect(() => {
    setOpenModals([])
  }, [location.pathname])

  return (
    <ModalContext.Provider
      value={{
        openModals,
        setModalOpen
      }}
    >
      {children}
    </ModalContext.Provider>
  )
}

export { ModalContext, ModalContextProvider }
