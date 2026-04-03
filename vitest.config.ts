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
      exclude: ['node_modules/', 'src/renderer/src/i18n/locales/']
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
