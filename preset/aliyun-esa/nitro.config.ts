import type { NitroPreset } from 'nitro/types'
import { join } from 'node:path'

export default <NitroPreset>{
  extends: 'base-worker',
  minify: false,
  entry: join(__dirname, 'entry.ts'),
  rollupConfig: {
    output: {
      format: 'module',
    },
  },
}
