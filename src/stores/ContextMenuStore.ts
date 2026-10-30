import { createStore } from 'solid-js/store'
import { invoke } from '@tauri-apps/api/core'
import { useNavigationStore } from '@/stores/NavigationStore'
import { useFileStore } from '@/stores/FileStore'
import { useOperationStore } from './OperationStore'

const nav = useNavigationStore()
const fil = useFileStore()
const ops = useOperationStore()

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


//========OPERAÇOES========
const dest = () => (fil.selectedFiles.length === 1 ? fil.selectedFiles[0] : nav.path)

const pasteDir = () =>
  ops.runOperation('copy', 'copy_items_to', { dirPaths: fil.copySelected, targetPath: dest() })

const moveDir = () =>
  ops.runOperation('move', 'move_items_to', { dirPaths: fil.cutSelected, targetPath: dest() })

async function compressToZip() {
  await ops.runOperation('compress', 'compress_to_zip', {
    filePaths: fil.selectedFiles,
    outputPath: nav.workspaces[nav.actualWorkspace] + '/' + state.text + '.zip',
  })
  fil.resetSelected()
}

async function extractZip() {
  await ops.runOperation('extract', 'extract_zip', {
    zipPaths: fil.selectedFiles,
    outputPath: nav.workspaces[nav.actualWorkspace],
  })
  fil.resetSelected()
}
//====================================
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
