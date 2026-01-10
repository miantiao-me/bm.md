import { create } from 'zustand'

type SubMenu = 'markdownStyle' | 'codeTheme' | null

interface CommandPaletteState {
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void

  subMenu: SubMenu
  setSubMenu: (menu: SubMenu) => void
  resetSubMenu: () => void
}

export const useCommandPaletteStore = create<CommandPaletteState>()(
  set => ({
    open: false,
    setOpen: open => set({ open, subMenu: null }),
    toggle: () => set(state => ({ open: !state.open, subMenu: null })),

    subMenu: null,
    setSubMenu: subMenu => set({ subMenu }),
    resetSubMenu: () => set({ subMenu: null }),
  }),
)
