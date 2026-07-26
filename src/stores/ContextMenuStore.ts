import { createStore } from 'solid-js/store'
import { invoke } from '@tauri-apps/api/core'
import { useNavigationStore } from '@/stores/NavigationStore'
import { useFileStore } from '@/stores/FileStore'
import { usePopupControl } from '@/stores/PopupControl'

const nav = useNavigationStore()
const fil = useFileStore()
const pop = usePopupControl()

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

function openRenamePopup() {
  const fil = useFileStore()

  if (fil.selectedFiles.length === 1) {
    const fullPath = fil.selectedFiles[0]
    const name = fullPath.split(/[/\\]/).pop() ?? ''
    setText(name)
  }

  setOnEnter(handleRename)
  openPopup()
}

function closePopup() {
  setState({ isOpen: false, text: '' })
}

function handleContextMenu(e: MouseEvent) {
  e.preventDefault()
  setState({ showMenu: true, menuPos: { x: e.pageX, y: e.pageY } })
}

async function handleRename() {
  if (fil.selectedFiles.length === 1) {
    state.text = fil.selectedFiles[0]
  }
  try {
    await invoke('rename_dir', {
      dirPaths: fil.selectedFiles,
      newName: nav.path + '/' + state.text,
    })
    fil.setReload(!fil.reload)
    fil.resetSelected()
  } catch (err) {
    console.error(err)
  }
}

async function makeDir() {
  const path =
    fil.files.find(f => f.path === fil.selectedFiles[0])?.ftype === "folder"
      ? fil.selectedFiles[0]
      : nav.path

  try {
    await invoke('make_dir', { dirPath: path + '/' + state.text })
    fil.setReload(!fil.reload)
  } catch (err) {
    console.error(err)
  }
}

async function makeFile() {
  const path =
    fil.files.find(f => f.path === fil.selectedFiles[0])?.ftype === "folder"
      ? fil.selectedFiles[0]
      : nav.path

  try {
    await invoke('make_file', { filePath: path + '/' + state.text })
    fil.setReload(!fil.reload)
  } catch (err) {
    console.error(err)
  }
}

async function pasteDir() {
  const id = crypto.randomUUID()
  pop.startCopy(id)
  try {
    await invoke('copy_items_to', {
      dirPaths: fil.copySelected,
      targetPath: fil.selectedFiles.length === 1 ? fil.selectedFiles[0] : nav.path,
      copyId: id,
    })
  } catch (error) {
    console.log(error)
  }
  pop.removeCopy(id)
  fil.setReload(!fil.reload)
  //fil.resetSelected()
  //fil.setCopySelected([])
}

async function moveDir() {
  try {
    document.body.style.cursor = 'wait'
    await invoke('move_items_to', {
      dirPaths: fil.cutSelected,
      targetPath: fil.selectedFiles.length === 1 ? fil.selectedFiles[0] : nav.path,
    })
  } catch (error) {
    console.log(error)
  } finally {
    document.body.style.cursor = 'default'
  }
  fil.setReload(!fil.reload)
  //fil.resetSelected()
  //fil.setCopySelected([])
}

async function moveToTrash() {
  try {
    await invoke('move_to_trash', { dirPaths: fil.selectedFiles })
    fil.resetSelected()
    fil.setReload(!fil.reload)
  } catch (err) {
    console.error(err)
  }
}

async function deleteItems() {
  try {
    await invoke('delete', { dirPath: fil.selectedFiles })
    fil.resetSelected()
    fil.setReload(!fil.reload)
  } catch (err) {
    console.log(err)
  }
}

async function compressToZip() {
  const id = crypto.randomUUID()
  pop.startCompress(id)

  try {
    await invoke('compress_to_zip', {
      filePaths: fil.selectedFiles,
      outputPath: nav.workspaces[nav.actualWorkspace] + '/' + state.text + '.zip',
      opId: id,
    })
  } catch (error) {
    console.log(error)
  }
  pop.removeCompress(id)
  fil.setReload(!fil.reload)
  fil.resetSelected()
}

async function extractZip() {
  const id = crypto.randomUUID()
  pop.startCompress(id)

  try {
    await invoke('extract_zip', {
      zipPaths: fil.selectedFiles,
      outputPath: nav.workspaces[nav.actualWorkspace],
      opId: id,
    })
    fil.setReload(!fil.reload)
  } catch (error) {
    console.log(error)
  }
  pop.removeCompress(id)
  fil.setReload(!fil.reload)
  fil.resetSelected()
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
  openRenamePopup,
  closePopup,
  handleContextMenu,
  handleRename,
  makeDir,
  makeFile,
  pasteDir,
  moveDir,
  moveToTrash,
  delete: deleteItems,
  compressToZip,
  extractZip,
})
