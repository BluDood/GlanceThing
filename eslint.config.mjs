import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import react from 'eslint-plugin-react'

export default defineConfig([
  globalIgnores(['node_modules/', 'dist/', 'out/', 'client/']),
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { js, react },
    extends: ['js/recommended'],
    languageOptions: {
      globals: globals.browser
    }
  },
  tseslint.configs.recommended,
  react.configs.flat.recommended,
  {
    rules: {
      // 'no-async-promise-executor': 'off',
      // '@typescript-eslint/no-explicit-any': 'off'
      'react/react-in-jsx-scope': 'off'
    },
    settings: {
      react: { version: 'detect' }
    }
  }
])
