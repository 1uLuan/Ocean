import { invoke } from '@tauri-apps/api/core'
import { createStore } from 'solid-js/store'

export type Fileinfo = {
  name: string
  ftype: string
  last_modified: number
  size: number
  path: string
}

type FileStore = {
  files: Fileinfo[]
  selectedFiles: string[]
  copySelected: string[]
  cutSelected: string[]
  pathName: string[]
  intervalSelected: number[]
  isLoading: boolean
  reload: boolean
}

const [state, setState] = createStore<FileStore>({
  files: [],
  selectedFiles: [],
  copySelected: [],
  cutSelected: [],
  pathName: [],
  intervalSelected: [],
  isLoading: false,
  reload: false,
})

//SET FILES
function setFiles(files: Fileinfo[]) {
  setState({ files })
}
//

//COPY AND COPY SELECTED FILES
function setCopySelected(fileSelecteds: string[]) {
  ;(setState({ copySelected: fileSelecteds }), setState({ cutSelected: [] }))
}
function setCutSelected(fileSelecteds: string[]) {
  ;(setState({ cutSelected: fileSelecteds }), setState({ copySelected: [] }))
}
//

//SELECTED FILES
function toggleSelected(file: string) {
  setState('selectedFiles', (prev) =>
    prev.includes(file) ? prev.filter((f) => f !== file) : [...prev, file]
  )
}
function setSelected(files: string[]) {
  setState({ selectedFiles: files })
}
function resetSelected() {
  setState({ selectedFiles: [] })
}
function isSelected(fileName: string) {
  return state.selectedFiles.includes(fileName)
}

//INTERVAL SELECTED
function setIntervalSelected(interval: number[]) {
  setState('intervalSelected', (prev) =>
    prev.length === 2 ? interval : [...state.intervalSelected, ...interval]
  )
}
function resetInterval() {
  setState({ intervalSelected: [] })
}
function intervalSelection(files: Fileinfo[]) {
  if (state.intervalSelected.length === 2) {
    resetSelected()

    const f = Math.min(...state.intervalSelected)
    const l = Math.max(...state.intervalSelected)

    for (let i = f; i <= l; i++) {
      toggleSelected(files[i].path)
    }
    console.log(state.intervalSelected)
  }
}
//

//PATH NAME
function setPathName(pathName: string[]) {
  setState({ pathName })
}

async function getPathName() {
  const names = await invoke<string[]>('get_path_name', {
    paths: state.selectedFiles,
  })
  setPathName(names)
}
//

function setIsLoading(isLoading: boolean) {
  setState({ isLoading })
}

function setReload(reload: boolean) {
  setState({ reload })
}

export const useFileStore = () => ({
  get files() {
    return state.files
  },
  get selectedFiles() {
    return state.selectedFiles
  },
  get copySelected() {
    return state.copySelected
  },
  get cutSelected() {
    return state.cutSelected
  },
  get pathName() {
    return state.pathName
  },
  get intervalSelected() {
    return state.intervalSelected
  },
  get isLoading() {
    return state.isLoading
  },
  get reload() {
    return state.reload
  },

  setFiles,
  toggleSelected,
  setSelected,
  setCopySelected,
  setCutSelected,
  setPathName,
  setIntervalSelected,
  resetInterval,
  resetSelected,
  setIsLoading,
  setReload,
  isSelected,
  intervalSelection,
  getPathName,
})
