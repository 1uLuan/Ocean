import { JSX } from 'solid-js/jsx-runtime'
import { createStore } from 'solid-js/store'
import FolderSimple from "~icons/ph/folder-simple-duotone"
import GameController from '~icons/ph/game-controller-duotone'
import { useFileStore } from './FileStore'

const fil = useFileStore()

type IconComponent = (...args: any[]) => JSX.Element

export type SidebarItem = {
  name: string
  icon: IconComponent
  path: string
}

const [state, setState] = createStore<{ items: SidebarItem[] }>({
  items: [],
})

function addItem(shortcut_path: string) {
  if (state.items.some((i) => i.name === fil.lastPathSegment(shortcut_path))) return
  setState('items', (prev) => [
    ...prev,
    {
      name: fil.lastPathSegment(shortcut_path),
      icon: fil.lastPathSegment(shortcut_path) === "Games" ? GameController : FolderSimple,
      path: shortcut_path,
    },
  ])
}

function removeItem(name: string) {
  setState('items', (prev) => prev.filter((i) => i.name !== name))
}

export const useSidebarItemsStore = () => ({
  get items() {
    return state.items
  },
  addItem,
  removeItem,
})
