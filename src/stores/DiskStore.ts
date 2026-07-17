// DiskStore.ts
import { createStore } from 'solid-js/store'
import { invoke } from '@tauri-apps/api/core'
import { listen, UnlistenFn } from '@tauri-apps/api/event'

export type PartitionInfo = {
  object_path: string
  mount_point: string
  is_mounted: boolean
  file_system: string
  total_space: number
  available_space: number
  used_space: number
}

export type DiskInfo = {
  drive_object_path: string
  name: string
  vendor: string
  is_removable: boolean
  kind: string
  bus: string
  partitions: PartitionInfo[] // <-- array, não objeto único
}

type DiskState = {
  disks: DiskInfo[]
  loading: boolean
  initialized: boolean
}

const [state, setState] = createStore<DiskState>({
  disks: [],
  loading: false,
  initialized: false,
})

let unlisten: UnlistenFn | undefined

async function refreshDisks() {
  setState({ loading: true })
  try {
    const disks = await invoke<DiskInfo[]>('list_disks')
    setState({ disks })
  } catch (err) {
    console.error(err)
  } finally {
    setState({ loading: false })
  }
}

async function initDisks() {
  if (state.initialized) return // evita registrar o listener/watch duas vezes

  await invoke('watch_disks')
  await refreshDisks()

  unlisten = await listen('disks_changed', () => {
    refreshDisks()
  })

  setState({ initialized: true })
}

function disposeDisks() {
  unlisten?.()
  unlisten = undefined
  setState({ initialized: false })
}

async function mountDisk(objectPath: string): Promise<string | null> {
  try {
    const mountPoint = await invoke<string>('mount_disk', { objectPath })
    await refreshDisks()
    return mountPoint
  } catch (err) {
    console.error(err)
    return null
  }
}

async function unmountDisk(objectPath: string) {
  try {
    await invoke('unmount_disk', { objectPath })
    await refreshDisks()
  } catch (err) {
    console.error(err)
  }
}

async function ejectDisk(objectPath: string, driveObjectPath: string) {
  try {
    await invoke('eject_disk', { objectPath, driveObjectPath })
    await refreshDisks()
  } catch (err) {
    console.error(err)
  }
}

export const useDiskStore = () => ({
  get disks() {
    return state.disks
  },
  get loading() {
    return state.loading
  },
  get initialized() {
    return state.initialized
  },
  initDisks,
  disposeDisks,
  refreshDisks,
  mountDisk,
  unmountDisk,
  ejectDisk,
})
