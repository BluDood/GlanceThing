import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['node_modules/', 'dist/', 'out/', 'client/']),
  {
    files: ['**/*.ts'],
    plugins: { js },
    extends: ['js/recommended']
  },
  tseslint.configs.recommended,
  {
    rules: {
      // 'no-async-promise-executor': 'off',
      // '@typescript-eslint/no-explicit-any': 'off'
    }
  }
])
