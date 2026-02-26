import { onMount, onCleanup, createSignal, createResource, Show } from 'solid-js'
import { listen, UnlistenFn } from '@tauri-apps/api/event'
import { X } from 'phosphor-solid'
import { invoke } from '@tauri-apps/api/core'

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
  const [file, setFile] = createSignal('')
  const [progress, setProgress] = createSignal(0)
  const [totalBytes, setTotalBytes] = createSignal(0)
  const [copiedBytes, setCopiedBytes] = createSignal(0)
  const [total, setTotal] = createSignal(0)
  const [current, setCurrent] = createSignal(0)

  onMount(() => {
    let unlisten: UnlistenFn | undefined

    listen<TypeCopyProgress>('copy_progress', (event) => {
      const data = event.payload
      if (data.copy_id !== props.copyId) return
      setFile(data.file)
      setProgress(data.file_percent)
      setTotalBytes(data.total_bytes)
      setCopiedBytes(data.copied_bytes)
      setTotal(data.total)
      setCurrent(data.current)
    }).then((fn) => (unlisten = fn))

    onCleanup(() => unlisten?.())
  })

  const [formattedTotal] = createResource(totalBytes, (bytes: number) =>
    invoke<string>('format_size', { bytes })
  )
  const [formattedCopied] = createResource(copiedBytes, (bytes: number) =>
    invoke<string>('format_size', { bytes })
  )

  return (
    <div class="flex h-40 w-full shrink-0 flex-col rounded-md border border-[var(--border-secondary)] bg-[var(--bg-card)] p-1">
      {/*top*/}
      <div class="flex flex-row items-start justify-between">
        <div class="w-8/12 truncate rounded-sm border border-[var(--border-secondary)] bg-[var(--bg-secondary)] pl-1 text-[0.75rem]">
          {file()}
        </div>
        <button
          class="transition-color flex h-7 w-7 items-center justify-center rounded-sm border border-[var(--border-secondary)] duration-150 hover:bg-[var(--accent-danger)]"
          onClick={() => props.onCancel(props.copyId)}
        >
          <X weight="regular" size={14} />
        </button>
      </div>
      {/*middle*/}
      <div class="flex flex-row gap-2">
        <Show when={total() > 1}>
          <div class="pl-0.5 text-[0.70rem]">Current: {current()}</div>
          <div class="pl-0.5 text-[0.70rem]">Total: {total()}</div>
        </Show>
      </div>
      {/*bottom*/}
      <div class="flex h-full w-full flex-col justify-end">
        <div class="flex flex-row pl-1">
          <div class="text-[0.75rem]">{Math.floor(progress())}%</div>
          <div class="flex w-full flex-row justify-end">
            <div class="mr-1 text-[0.75rem]">
              {formattedCopied()} De {formattedTotal()}
            </div>
          </div>
        </div>
        <div class="trasparent flex h-1.5 w-full flex-row gap-0.5 overflow-hidden">
          <div
            class="h-full rounded-full bg-[var(--accent-glow)] transition-[width] ease-in-out"
            style={{ width: Math.floor(progress()) + '%' }}
          />
          <div class="h-full flex-1 rounded-full bg-[var(--bg-primary)] transition-[width] ease-in-out" />
        </div>
      </div>
    </div>
  )
}
