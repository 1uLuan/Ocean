import { createStore } from 'solid-js/store'
import { invoke } from '@tauri-apps/api/core'
import { useFileStore } from './FileStore'

type CopyPopupState = {
  copyProgress: boolean
  progress: number
  fileOnCopy: string
  total: number
  elapsed_secs: number
}

export type TypeCopyProgress = {
  current: number
  file: string
  percent: number
  file_percent: number
  total: number
  elapsed_secs: number
  copied_bytes: number
  total_bytes: number
}

const [state, setState] = createStore<CopyPopupState>({
  copyProgress: false,
  progress: 0,
  fileOnCopy: '',
  total: 0,
  elapsed_secs: 0,
})

function setShowCopyProgress(value: boolean) {
  setState({ copyProgress: value })
}

function setProgress(v: number) {
  setState({ progress: v })
}

function setFileOnCopy(v: string) {
  setState({ fileOnCopy: v })
}

function setTotal(v: number) {
  setState({ total: v })
}

function setElapsed_secs(v: number) {
  setState({ elapsed_secs: v })
}

async function cancelCopy() {
  const file = useFileStore()
  await invoke('cancel_func')
  setShowCopyProgress(false)
  file.setReload(!file.reload)
}

export const useCopyPopupStore = () => ({
  get copyProgress() {
    return state.copyProgress
  },
  get progress() {
    return state.progress
  },
  get fileOnCopy() {
    return state.fileOnCopy
  },
  get total() {
    return state.total
  },
  get elapsed_secs() {
    return state.elapsed_secs
  },
  setShowCopyProgress,
  setProgress,
  setFileOnCopy,
  setTotal,
  setElapsed_secs,
  cancelCopy,
})
