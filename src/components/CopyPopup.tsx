import { onMount, onCleanup, createSignal } from 'solid-js'
import { listen, UnlistenFn } from '@tauri-apps/api/event'
import { X } from 'phosphor-solid'

type TypeCopyProgress = {
  copy_id: string
  current: number
  file: string
  percent: number
  file_percent: number
  total: number
  elapsed_secs: number
  copied_bytes: number
  total_bytes: number
}

type Props = {
  copyId: string
  onCancel: (id: string) => void
}

export function CopyPopup(props: Props) {
  const [progress, setProgress] = createSignal(0)
  const [elapsed, setElapsed] = createSignal(0)
  const [file, setFile] = createSignal('')

  onMount(() => {
    let unlisten: UnlistenFn | undefined

    listen<TypeCopyProgress>('copy_progress', (event) => {
      const data = event.payload
      if (data.copy_id !== props.copyId) return
      setProgress(data.file_percent)
      setElapsed(data.elapsed_secs)
      setFile(data.file)
    }).then((fn) => (unlisten = fn))

    onCleanup(() => unlisten?.())
  })

  return (
    <div class="h-40 w-full rounded-md border border-[var(--border-secondary)] bg-[var(--bg-tertiary)] p-[4px]">
      <div class="flex items-start justify-between">
        <div class="w-auto rounded-[4px] border border-[var(--border-secondary)] bg-[var(--bg-secondary)] pr-2 pl-2 text-[12px]">
          {file()}
        </div>
        <button
          class="transition-color flex h-[26px] w-[26px] items-center justify-center rounded-md border border-[var(--border-secondary)] bg-[var(--bg-tertiary)] duration-200 hover:bg-red-700"
          onClick={() => props.onCancel(props.copyId)}
        >
          <X weight="light" size={14} />
        </button>
      </div>
      <div class="flex h-[73%] flex-col justify-end-safe">
        <div class="flex flex-row gap-10">
          <div class="text-[11px]">{Math.floor(progress())}%</div>
          <div class="text-[11px]">Tempo: {Math.floor(elapsed())}s</div>
        </div>
        <div class="trasparent flex h-[6px] w-full gap-1 overflow-hidden">
          <div
            class="h-[100%] rounded-full bg-blue-500 transition-[width] ease-in-out"
            style={{ width: Math.floor(progress()) + '%' }}
          />
          <div class="h-[100%] flex-1 rounded-full bg-red-500 transition-[width] ease-in-out" />
        </div>
      </div>
    </div>
  )
}
