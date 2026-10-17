import js from '@eslint/js'
import ts from 'typescript-eslint'
import { defineConfig } from 'eslint/config'

export default defineConfig(
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    ignores: ['lib/**', 'node_modules/**', '*.d.ts', '.dist/**'],
  },
  {
    files: ['src/**/*.{ts,tsx}', 'test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-console': 'off',
    },
  },
)
