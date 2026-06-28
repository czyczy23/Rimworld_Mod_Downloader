import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    reporters: process.env.CI ? ['default'] : ['default'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage/unit',
      reporter: ['text', 'json-summary', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'node_modules/',
        '**/__tests__/**',
        '**/*.d.ts',
        'src/renderer/src/i18n/locales/',
        'src/renderer/src/main.tsx',
        'src/main/index.ts',
        'src/preload/index.ts',
        'src/main/utils/AutoUpdater.ts'
      ],
      thresholds: {
        statements: 25,
        branches: 20,
        lines: 27,
        functions: 15
      }
    }
  },
  resolve: {
    alias: {
      '@renderer': resolve('src/renderer/src'),
      '@main': resolve('src/main'),
      '@preload': resolve('src/preload'),
      '@shared': resolve('src/shared')
    }
  }
})
