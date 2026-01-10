import type { NitroPreset } from 'nitro/types'
import { join } from 'node:path'

export default <NitroPreset>{
  extends: 'node',
  minify: false,
  entry: join(__dirname, 'entry.ts'),
  rollupConfig: {
    output: {
      format: 'module',
    },
  },
}
