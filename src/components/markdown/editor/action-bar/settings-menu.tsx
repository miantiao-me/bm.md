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
  const store = useEditorStore()

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
                checked={store[item.storeKey]}
                onCheckedChange={store[item.setterKey]}
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
