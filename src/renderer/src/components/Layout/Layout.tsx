import React from 'react'
import { Outlet } from 'react-router-dom'

import Developer from '@/pages/Developer/Developer.js'
import Shortcuts from '@/pages/Shortcuts/Shortcuts.js'
import Settings from '@/pages/Settings/Settings.js'

import Titlebar from '@/components/Titlebar/Titlebar.js'

import styles from './Layout.module.css'

const Layout: React.FC = () => {
  return (
    <>
      <div className={styles.layout}>
        <Titlebar />
        <div className={styles.outlet}>
          <Outlet />
        </div>
      </div>
      <Settings />
      <Shortcuts />
      <Developer />
    </>
  )
}

export default Layout
