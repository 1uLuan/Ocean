// src/stores/OperationStore.ts
import { createStore, produce } from 'solid-js/store'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { useFileStore } from '@/stores/FileStore'

export type OpKind = 'copy' | 'move' | 'compress' | 'extract'

export type OpProgress = {
  op_id: string
  kind: OpKind
  file: string
  current_item: number
  total_items: number
  processed_bytes: number
  total_bytes: number
  percent: number
  elapsed_secs: number
  bytes_per_sec: number
}

const [state, setState] = createStore<{ ops: Record<string, OpProgress> }>({ ops: {} })

let listening = false

// Um único listener para todas as operações (em vez de um por popup).
async function initOperations() {
  if (listening) return
  listening = true
  await listen<OpProgress>('file_op_progress', (event) => {
    const p = event.payload
    // ignora eventos atrasados de operações que já terminaram
    if (p.op_id in state.ops) setState('ops', p.op_id, p)
  })
}

async function runOperation(kind: OpKind, command: string, args: Record<string, unknown>) {
  const fil = useFileStore()
  const opId = crypto.randomUUID()

  setState('ops', opId, {
    op_id: opId,
    kind,
    file: '',
    current_item: 0,
    total_items: 0,
    processed_bytes: 0,
    total_bytes: 0,
    percent: 0,
    elapsed_secs: 0,
    bytes_per_sec: 0,
  })

  try {
    await invoke(command, { ...args, opId })
  } catch (err) {
    console.error(err)
  } finally {
    setState(
      'ops',
      produce((ops) => {
        delete ops[opId]
      })
    )
    fil.setReload(!fil.reload)
  }
}

function cancelOperation(opId: string) {
  return invoke('cancel_op', { opId })
}

export const useOperationStore = () => ({
  get ops() {
    return state.ops
  },
  initOperations,
  runOperation,
  cancelOperation,
})
