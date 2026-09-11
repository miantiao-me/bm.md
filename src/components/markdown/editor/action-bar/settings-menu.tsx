import { Settings } from 'lucide-react'
import { Fragment } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { editorSettingsConfig } from '@/config'
import { useEditorStore } from '@/stores/editor'

const settingsTooltip = '编辑器设置'
const settingsAriaLabel = '编辑器设置'

export function SettingsMenu() {
  const enableFootnoteLinks = useEditorStore(state => state.enableFootnoteLinks)
  const breaks = useEditorStore(state => state.breaks)
  const openLinksInNewWindow = useEditorStore(state => state.openLinksInNewWindow)
  const enableScrollSync = useEditorStore(state => state.enableScrollSync)
  const settings = {
    enableFootnoteLinks,
    breaks,
    openLinksInNewWindow,
    enableScrollSync,
  }

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={(
            <DropdownMenuTrigger
              render={(
                <Button variant="ghost" size="icon" aria-label={settingsAriaLabel}>
                  <Settings className="size-4" />
                </Button>
              )}
            />
          )}
        />
        <TooltipContent>{settingsTooltip}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>编辑器设置</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {editorSettingsConfig.map(item => (
            <Fragment key={item.id}>
              {'separator' in item && item.separator && <DropdownMenuSeparator />}
              <DropdownMenuCheckboxItem
                className="cursor-pointer"
                checked={settings[item.storeKey]}
                onCheckedChange={(checked) => {
                  useEditorStore.getState()[item.setterKey](checked)
                }}
              >
                {item.label}
              </DropdownMenuCheckboxItem>
            </Fragment>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
