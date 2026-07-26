import { onMount, createSignal, Show } from 'solid-js'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import X from '~icons/ph/x'

type TypeCopyProgress = {
  copy_id: string
  current: number
  total: number
  file: string
  file_percent: number
  total_percent: number
  elapsed_secs: number
  copied_bytes: number
  total_bytes: number
}

type Props = {
  copyId: string
  onCancel: (id: string) => void
}

// Utilitário simples sem IPC para não sobrecarregar a bridge do Tauri
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function CopyPopup(props: Props) {
  const [file, setFile] = createSignal('')
  const [progress, setProgress] = createSignal(0)
  const [totalBytes, setTotalBytes] = createSignal(0)
  const [copiedBytes, setCopiedBytes] = createSignal(0)
  const [total, setTotal] = createSignal(0)
  const [current, setCurrent] = createSignal(0)

  onMount(() => {
    let unlisten: UnlistenFn | undefined

    const setupListener = async () => {
      unlisten = await listen<TypeCopyProgress>('copy_progress', (event) => {
        const data = event.payload
        if (data.copy_id !== props.copyId) return

        setFile(data.file)
        setProgress(data.total_percent)
        setTotalBytes(data.total_bytes)
        setCopiedBytes(data.copied_bytes)
        setTotal(data.total)
        setCurrent(data.current)
      })
    }

    setupListener()

    // O SolidJS aceita cleanup retornando uma closure direto no setup
    return () => {
      if (unlisten) unlisten()
    }
  })

  return (
    <div class="flex h-40 w-full shrink-0 flex-col rounded-md border border-(--border-secondary) bg-(--bg-card) p-1">
      {/* Top */}
      <div class="flex flex-row items-start justify-between">
        <div class="w-8/12 truncate rounded-sm border border-(--border-secondary) bg-(--bg-secondary) pl-1 text-[0.75rem]">
          {file() || 'Aguardando...'}
        </div>
        <button
          class="flex h-7 w-7 items-center justify-center rounded-sm border border-(--border-secondary) transition-colors duration-150 hover:bg-(--accent-danger)"
          onClick={() => props.onCancel(props.copyId)}
        >
          <X class="size-3" />
        </button>
      </div>

      {/* Middle */}
      <div class="flex flex-row gap-2">
        <Show when={total() > 1}>
          <div class="pl-0.5 text-[0.70rem]">Current: {current()}</div>
          <div class="pl-0.5 text-[0.70rem]">Total: {total()}</div>
        </Show>
      </div>

      {/* Bottom */}
      <div class="flex h-full w-full flex-col justify-end">
        <div class="flex flex-row pl-1">
          <div class="text-[0.75rem]">{Math.floor(progress())}%</div>
          <div class="flex w-full flex-row justify-end">
            <div class="mr-1 text-[0.75rem]">
              {formatBytes(copiedBytes())} de {formatBytes(totalBytes())}
            </div>
          </div>
        </div>
        <div class="flex h-1.5 w-full flex-row gap-0.5 overflow-hidden transparent">
          <div
            class="h-full rounded-full bg-(--accent-glow) transition-[width] duration-200 ease-in-out"
            style={{ width: `${Math.min(100, Math.max(0, progress()))}%` }}
          />
          <div class="h-full flex-1 rounded-full bg-(--bg-primary)" />
        </div>
      </div>
    </div>
  )
}
