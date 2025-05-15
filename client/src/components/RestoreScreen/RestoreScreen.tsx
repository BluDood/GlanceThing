import Loader from '@/components/Loading/Loader.tsx'

import styles from './RestoreScreen.module.css'

interface RestoreScreenProps {
  message: string
}

const RestoreScreen: React.FC<RestoreScreenProps> = ({ message }) => {
  return (
    <div className={styles.restore}>
      <div className={styles.background}></div>
      <Loader />
      <p>{message}...</p>
    </div>
  )
}

export default RestoreScreen