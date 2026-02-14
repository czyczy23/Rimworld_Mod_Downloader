// Polyfill File API for undici/fetch in Electron main process
// This must be imported before any other modules that use fetch

if (typeof File === 'undefined') {
  console.log('[Polyfill] Initializing File API polyfill')
  // @ts-ignore
  global.File = class File {
    name: string
    size: number
    type: string
    lastModified: number
    constructor(parts: any[], name: string, options: any = {}) {
      this.name = name
      this.size = 0
      this.type = options.type || ''
      this.lastModified = options.lastModified || Date.now()
    }
    async text(): Promise<string> { return '' }
    async arrayBuffer(): Promise<ArrayBuffer> { return new ArrayBuffer(0) }
  }
}

// Polyfill FormData API
if (typeof FormData === 'undefined') {
  console.log('[Polyfill] Initializing FormData API polyfill')
  // @ts-ignore
  global.FormData = class FormData {
    private data: Map<string, any> = new Map()
    append(key: string, value: any) { this.data.set(key, value) }
    get(key: string) { return this.data.get(key) }
    has(key: string) { return this.data.has(key) }
  }
}

console.log('[Polyfill] File and FormData polyfills loaded')
