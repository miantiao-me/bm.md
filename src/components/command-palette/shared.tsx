import type { HotkeyConfig } from './shared-data'
import { CommandShortcut } from '@/components/ui/command'
import { Kbd } from '@/components/ui/kbd'

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent)
const modKey = isMac ? '⌘' : 'Ctrl'

export function HotkeyShortcut({ hotkey }: { hotkey: HotkeyConfig }) {
  return (
    <CommandShortcut>
      <Kbd>{modKey}</Kbd>
      {hotkey.shift && <Kbd>⇧</Kbd>}
      <Kbd>{hotkey.key.toUpperCase()}</Kbd>
    </CommandShortcut>
  )
}
