import { invoke } from '@tauri-apps/api/core'
import { createStore } from 'solid-js/store'

type NavigationState = {
  path: string
  nextPath: string
  home: string
  actualWorkspace: number
  workspaces: string[]
}

const [state, setState] = createStore<NavigationState>({
  path: '',
  nextPath: '',
  home: '',
  actualWorkspace: 0,
  workspaces: [''],
})

// ações separadas do estado
function setPath(path: string) {
  setState({ path })
}

function setNextPath(nextPath: string) {
  setState({ nextPath })
}

function setHome(home: string) {
  setState({ home })
}

function setActualWorkspace(ws: number) {
  setState({
    actualWorkspace: ws,
    path: state.workspaces[ws] || state.home,
  })
}

// Adiciona um novo workspace e já navega pra ele
function addWorkspace(initialPath?: string) {
  const newPath = initialPath ?? state.home
  setState('workspaces', (prev) => [...prev, newPath])
  const newIndex = state.workspaces.length - 1
  setState({ actualWorkspace: newIndex, path: newPath })
  return newIndex
}

// Remove workspace pelo índice (não permite remover o último)
function removeWorkspace(ws: number) {
  if (state.workspaces.length <= 1) return

  setState('workspaces', (prev) => prev.filter((_, i) => i !== ws))

  // Ajusta o índice atual se necessário
  const newLength = state.workspaces.length
  const newActive = Math.min(state.actualWorkspace, newLength - 1)
  setState({
    actualWorkspace: newActive,
    path: state.workspaces[newActive] || state.home,
  })
}

function setWorkspacePath(ws: number) {
  setState('workspaces', ws, state.home)
}

function goPath(path: string) {
  setState('workspaces', state.actualWorkspace, path)
  setState({ path })
}

function getCurrentWorkspacePath() {
  return state.workspaces[state.actualWorkspace]
}

async function goBackPath() {
  const oldPath = await invoke<string>('back_dir', { dirPath: state.path })
  setState({ nextPath: state.path })
  goPath(oldPath)
}

async function goNextPath() {
  goPath(state.nextPath)
}

// exporta tudo junto
export const useNavigationStore = () => ({
  // estado reativo
  get path() {
    return state.path
  },
  get nextPath() {
    return state.nextPath
  },
  get home() {
    return state.home
  },
  get actualWorkspace() {
    return state.actualWorkspace
  },
  get workspaces() {
    return state.workspaces
  },
  get workspaceCount() {
    return state.workspaces.length
  },
  // ações
  setPath,
  setNextPath,
  setHome,
  setActualWorkspace,
  setWorkspacePath,
  addWorkspace,
  removeWorkspace,
  goPath,
  getCurrentWorkspacePath,
  goBackPath,
  goNextPath,
})
