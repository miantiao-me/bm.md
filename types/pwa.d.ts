/// <reference types="vite-plugin-pwa/client" />

interface LaunchParams {
  files?: FileSystemFileHandle[]
  targetURL?: string
}

interface LaunchQueue {
  setConsumer: (consumer: (params: LaunchParams) => void) => void
}

interface Window {
  launchQueue?: LaunchQueue
}
