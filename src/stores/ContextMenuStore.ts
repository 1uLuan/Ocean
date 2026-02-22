import { createStore } from 'solid-js/store'
import { invoke } from '@tauri-apps/api/core'
import { useNavigationStore } from '@/stores/NavigationStore'
import { useFileStore } from '@/stores/FileStore'
import { usePopupControl } from '@/stores/PopupControl'

type MenuPosition = { x: number; y: number } | null

type MenuState = {
  showMenu: boolean
  menuPos: MenuPosition
  showDirMenu: boolean
  isOpen: boolean
  text: string
  onEnter?: () => void
}

const [state, setState] = createStore<MenuState>({
  showMenu: false,
  menuPos: null,
  showDirMenu: false,
  isOpen: false,
  text: '',
  onEnter: undefined,
})

function setShowMenu(value: boolean) {
  setState({ showMenu: value })
}

function setMenuPos(value: MenuPosition) {
  setState({ menuPos: value })
}

function setShowDirMenu(value: boolean) {
  setState({ showDirMenu: value })
}

function setIsOpen(value: boolean) {
  setState({ isOpen: value })
}

function setText(value: string) {
  setState({ text: value })
}

function setOnEnter(fn: () => void) {
  setState({ onEnter: fn })
}

function openPopup() {
  setState({ isOpen: true })
}

function closePopup() {
  setState({ isOpen: false, text: '' })
}

function handleContextMenu(e: MouseEvent) {
  e.preventDefault()
  setState({ showMenu: true, menuPos: { x: e.pageX, y: e.pageY } })
}

async function handleRename() {
  const nav = useNavigationStore()
  const fil = useFileStore()
  try {
    await invoke('rename_dir', {
      dirPaths: fil.selectedFiles,
      newName: nav.path + '/' + state.text,
    })
    closePopup()
    fil.setReload(!fil.reload)
    fil.resetSelected()
  } catch (err) {
    console.error(err)
  }
}

async function makeDir() {
  const nav = useNavigationStore()
  const fil = useFileStore()
  try {
    await invoke('make_dir', { dirPath: nav.path + '/' + state.text })
    closePopup()
    fil.setReload(!fil.reload)
  } catch (err) {
    console.error(err)
  }
}

async function makeFile() {
  const nav = useNavigationStore()
  const fil = useFileStore()
  try {
    await invoke('make_file', { filePath: nav.path + '/' + state.text })
    closePopup()
    fil.setReload(!fil.reload)
  } catch (err) {
    console.error(err)
  }
}

async function pasteDir() {
  const nav = useNavigationStore()
  const fil = useFileStore()
  const pop = usePopupControl()
  const id = crypto.randomUUID()
  pop.startCopy(id)
  try {
    await invoke('copy_items_to', {
      dirPaths: fil.copySelected,
      targetPath: nav.path,
      copyId: id,
    })
  } catch (error) {
    console.log(error)
  }
  pop.removeCopy(id)
  fil.setReload(!fil.reload)
  fil.resetSelected()
  fil.setCopySelected([])
}

async function moveDir() {
  const nav = useNavigationStore()
  const fil = useFileStore()
  try {
    document.body.style.cursor = 'wait'
    await invoke('move_items_to', {
      dirPaths: fil.cutSelected,
      targetPath: nav.workspaces[nav.actualWorkspace],
    })
  } catch (error) {
    console.log(error)
  } finally {
    document.body.style.cursor = 'default'
  }
  fil.setReload(!fil.reload)
  fil.resetSelected()
  fil.setCopySelected([])
}

async function moveToTrash() {
  const fil = useFileStore()
  try {
    await invoke('move_to_trash', { dirPath: fil.selectedFiles })
    fil.resetSelected()
    fil.setReload(!fil.reload)
  } catch (err) {
    console.error(err)
  }
}

async function deleteItems() {
  const fil = useFileStore()
  try {
    await invoke('delete', { dirPath: fil.selectedFiles })
    fil.resetSelected()
    fil.setReload(!fil.reload)
  } catch (err) {
    console.log(err)
  }
}

export const useContextMenuStore = () => ({
  get showMenu() {
    return state.showMenu
  },
  get menuPos() {
    return state.menuPos
  },
  get showDirMenu() {
    return state.showDirMenu
  },
  get isOpen() {
    return state.isOpen
  },
  get text() {
    return state.text
  },
  get onEnter() {
    return state.onEnter
  },
  setShowMenu,
  setMenuPos,
  setShowDirMenu,
  setIsOpen,
  setText,
  setOnEnter,
  openPopup,
  closePopup,
  handleContextMenu,
  handleRename,
  makeDir,
  makeFile,
  pasteDir,
  moveDir,
  moveToTrash,
  delete: deleteItems,
})
