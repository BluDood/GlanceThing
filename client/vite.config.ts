import { defineConfig } from 'vite'
import { resolve } from 'path'
import fs from 'fs/promises'

import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

const pkg = JSON.parse(await fs.readFile('./package.json', 'utf8'))

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: ['Chrome 69'],
      renderModernChunks: false
    })
  ],
  base: '/usr/share/qt-superbird-app/webapp/',
  resolve: {
    alias: {
      '@': resolve('src')
    }
  },
  define: {
    __VERSION__: JSON.stringify(pkg.version)
  }
})
