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

  const [panelIsOpen, setPanel] = createSignal(false)

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
    <div
      class="relative flex h-8 w-full flex-col justify-center rounded-md border border-(--border-primary) bg-(--bg-tertiary) p-1"
      onClick={() => setPanel(!panelIsOpen())}
    >
      <span class="truncate text-center text-[0.85rem]">{'Copiando ' + file()}</span>
      <Show when={panelIsOpen()}>
        <div
          data-="Overlay"
          class="fixed inset-0 z-40 h-screen w-screen bg-transparent"
          onMouseDown={() => {
            setPanel(false)
          }}
        />
        <div
          class="absolute bottom-px left-38 z-50 flex h-20 w-72 flex-col rounded-md border border-(--border-primary) bg-(--bg-modal) p-1 shadow-(--shadow-md)"
          onClick={(e) => e.stopPropagation()}
        >
          <div class="flex w-full flex-row">
            <span class="w-full flex-1 truncate">{file()}</span>
            <div
              class="flex h-5 items-center justify-center rounded-sm hover:bg-(--bg-hover-secondary)"
              onclick={() => props.onCancel(props.copyId)}
            >
              <X></X>
            </div>
          </div>
          <div class="flex h-full w-full flex-col justify-end">
            <div class="flex flex-row">
              <span class="flex-1 text-[0.8rem]">
                {formatBytes(copiedBytes())} {formatBytes(totalBytes())}
              </span>
              <Show when={total() > 1}>
                <span class="text-[0.78rem]">{current() + '/' + total()}</span>
              </Show>
            </div>
            <div
              class="h-1.5 w-full rounded-lg bg-(--accent-primary)"
              style={{ width: `${Math.floor(progress())}%` }}
            ></div>
          </div>
        </div>
      </Show>
    </div>
  )
}
