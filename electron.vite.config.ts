import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// Polyfill code that will be injected at the top of the main process bundle
const POLYFILL_CODE = `
// Polyfill File API for undici/fetch in Electron main process
if (typeof File === 'undefined') {
  console.log('[Polyfill] Initializing File API polyfill')
  global.File = class File {
    constructor(parts, name, options = {}) {
      this.name = name
      this.size = 0
      this.type = options.type || ''
      this.lastModified = options.lastModified || Date.now()
    }
    async text() { return '' }
    async arrayBuffer() { return new ArrayBuffer(0) }
  }
}

if (typeof FormData === 'undefined') {
  console.log('[Polyfill] Initializing FormData API polyfill')
  global.FormData = class FormData {
    constructor() { this.data = new Map() }
    append(key, value) { this.data.set(key, value) }
    get(key) { return this.data.get(key) }
    has(key) { return this.data.has(key) }
  }
}

console.log('[Polyfill] File and FormData polyfills loaded')
`

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts')
        },
        output: {
          banner: POLYFILL_CODE
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts')
        }
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@main': resolve('src/main'),
        '@preload': resolve('src/preload'),
        '@shared': resolve('src/shared')
      }
    },
    plugins: [react()],
    build: {
      outDir: 'out/renderer',
      emptyOutDir: true,
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html')
        }
      }
    }
  }
})
