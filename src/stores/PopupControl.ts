import { createStore } from 'solid-js/store'
import { invoke } from '@tauri-apps/api/core'
import { useFileStore } from '@/stores/FileStore'

type PopupControl = {
  warningPopup: boolean
  copies: string[]
}

const [state, setState] = createStore<PopupControl>({
  warningPopup: false,
  copies: [],
})

function setWarningPopup(value: boolean) {
  setState('warningPopup', value)
}

function startCopy(id: string) {
  setState('copies', (prev) => [...prev, id])
}

function removeCopy(id: string) {
  setState('copies', (prev) => prev.filter((c) => c !== id))
}

async function cancelCopy(id: string) {
  const fil = useFileStore()
  await invoke('cancel_func')
  removeCopy(id)
  fil.setReload(!fil.reload)
}

export const usePopupControl = () => ({
  get warningPopup() {
    return state.warningPopup
  },
  get copies() {
    return state.copies
  },
  setWarningPopup,
  startCopy,
  cancelCopy,
  removeCopy,
})
