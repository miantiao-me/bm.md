import { registerSW } from 'virtual:pwa-register'

export function initPWA() {
  registerSW({
    immediate: true,
    onOfflineReady() {
      console.info('[bm.md] 应用已准备好离线使用')
    },
  })
}
