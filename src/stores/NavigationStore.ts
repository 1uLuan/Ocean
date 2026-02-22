// import { invoke } from '@tauri-apps/api/core'
// import { create } from 'zustand'

// type NavigationStore = {
//   path: string
//   setPath: (path: string) => void
//   nextPath: string
//   setNextPath: (nextPath: string) => void
//   home: string
//   setHome: (home: string) => void

//   //workspaces variables
//   actualWorkspace: 0 | 1 | 2 | 3
//   setActualWorkspace: (ws: 0 | 1 | 2 | 3) => void
//   workspaces: Record<0 | 1 | 2 | 3, string>
//   setWorkspacePath: (ws: 0 | 1 | 2 | 3) => void

//   //==========funções===========
//   goPath: (path: string) => void
//   getCurrentWorkspacePath: () => string
//   goBackPath: () => Promise<void>
//   goNextPath: () => Promise<void>
// }

// export const useNavigationStore = create<NavigationStore>((set, get) => ({
//   path: '',
//   nextPath: '',
//   home: '',
//   actualWorkspace: 0,
//   workspaces: {
//     0: '',
//     1: '',
//     2: '',
//     3: '',
//   },

//   setPath: (np: string) => set({ path: np }),
//   setNextPath: (nnp: string) => set({ nextPath: nnp }),
//   setHome: (nh: string) => set({ home: nh }),
//   setActualWorkspace: (ws: 0 | 1 | 2 | 3) => {
//     const { workspaces } = get()
//     // Ao trocar workspace, carrega o path salvo
//     set({
//       actualWorkspace: ws,
//       path: workspaces[ws] || get().home,
//     })
//   },
//   setWorkspacePath: (ws: 0 | 1 | 2 | 3) => {
//     const { workspaces } = get()
//     set({ workspaces: { ...workspaces, [ws]: get().home } })
//   },

//   goPath: (path: string) => {
//     const { actualWorkspace, workspaces } = get()
//     // Atualiza o path do workspace atual e o path global
//     set({
//       workspaces: {
//         ...workspaces,
//         [actualWorkspace]: path,
//       },
//       path,
//     })
//   },

//   getCurrentWorkspacePath: () => {
//     const { actualWorkspace, workspaces } = get()
//     return workspaces[actualWorkspace]
//   },
//   goBackPath: async () => {
//     const { path } = get()
//     const old_path = await invoke<string>('back_dir', { dirPath: path })

//     get().goPath(old_path)
//     set({
//       nextPath: path,
//     })
//   },

//   goNextPath: async () => {
//     const { goPath, nextPath } = get()
//     goPath(nextPath)
//   },
// }))
import { invoke } from '@tauri-apps/api/core'
import { createStore } from 'solid-js/store'

type NavigationState = {
  path: string
  nextPath: string
  home: string
  actualWorkspace: 0 | 1 | 2 | 3
  workspaces: Record<0 | 1 | 2 | 3, string>
}

const [state, setState] = createStore<NavigationState>({
  path: '',
  nextPath: '',
  home: '',
  actualWorkspace: 0,
  workspaces: { 0: '', 1: '', 2: '', 3: '' },
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

function setActualWorkspace(ws: 0 | 1 | 2 | 3) {
  setState({
    actualWorkspace: ws,
    path: state.workspaces[ws] || state.home,
  })
}

function setWorkspacePath(ws: 0 | 1 | 2 | 3) {
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
  // ações
  setPath,
  setNextPath,
  setHome,
  setActualWorkspace,
  setWorkspacePath,
  goPath,
  getCurrentWorkspacePath,
  goBackPath,
  goNextPath,
})
