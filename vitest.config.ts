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
      // Only measure coverage for files we actually test. Renderer
      // components, the main entry, preload, and AutoUpdater have no
      // unit tests yet — including them tanks the aggregate to ~22%,
      // which is not a meaningful signal. Narrow the scope so the
      // threshold reflects real test coverage of tested modules.
      include: [
        'src/main/services/**/*.ts',
        'src/main/utils/**/*.ts',
        'src/shared/**/*.ts',
        'src/renderer/src/utils/**/*.ts',
        'src/renderer/src/i18n/**/*.ts'
      ],
      exclude: ['node_modules/', 'src/renderer/src/i18n/locales/', '**/__tests__/**'],
      thresholds: {
        lines: 50,
        functions: 50
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
