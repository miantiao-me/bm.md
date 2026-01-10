/**
 * 统计分析工具库 - 基于 Rybbit
 * - 事件名称格式：module:action:source
 * - 开发环境不上报
 * - 脚本不存在时静默失败
 */

interface RybbitGlobal {
  event: (name: string, properties?: Record<string, unknown>) => void
}

declare global {
  interface Window {
    rybbit?: RybbitGlobal
  }
}

/**
 * 上报事件
 * @param module 模块名称
 * @param action 操作名称
 * @param source 触发来源
 * @param properties 额外属性（可选）
 */
export function trackEvent(
  module: string,
  action: string,
  source: string,
  properties?: Record<string, unknown>,
): void {
  if (import.meta.env.DEV)
    return
  if (!window.rybbit?.event)
    return

  const eventName = `${module}:${action}:${source}`
  window.rybbit.event(eventName, properties)
}
