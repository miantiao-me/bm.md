// 统一导出，保持现有导入路径兼容
export { appConfig } from './app'
export {
  editorCommandConfig,
  editorSettingsConfig,
  navigationConfig,
  platformConfig,
  supportedPlatforms,
  viewModeConfig,
} from './commands'
export type { SupportedPlatform } from './commands'
export { scalarConfig } from './scalar'
