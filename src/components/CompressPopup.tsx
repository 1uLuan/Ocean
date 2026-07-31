import { onMount, onCleanup, createSignal, createResource, Show } from 'solid-js'
import { listen, UnlistenFn } from '@tauri-apps/api/event'
import  X  from '~icons/ph/x'
import { invoke } from '@tauri-apps/api/core'

type CompressProgressPayload = {
  op_id: string
  file: string
  processed_bytes: number
  total_bytes: number
  file_total_bytes: number
  percent: number
  elapsed_secs: number
}

type Props = {
  opId: string
  onCancel: (id: string) => void
}

export function CompressPopup(props: Props) {
  const [file, setFile] = createSignal('')
  const [percent, setPercent] = createSignal(0)
  const [totalBytes, setTotalBytes] = createSignal(0)
  //const [fileTotalBytes, setFileTotalBytes] = createSignal(0)
  const [processedBytes, setProcessedBytes] = createSignal(0)
  const [elapsedSecs, setElapsedSecs] = createSignal(0)

  onMount(() => {
    let unlisten: UnlistenFn | undefined

    listen<CompressProgressPayload>('compress_progress', (event) => {
      const data = event.payload
      if (data.op_id !== props.opId) return
      setFile(data.file)
      setPercent(data.percent)
      setTotalBytes(data.total_bytes)
      //setFileTotalBytes(data.file_total_bytes)
      setProcessedBytes(data.processed_bytes)
      setElapsedSecs(data.elapsed_secs)
    }).then((fn) => (unlisten = fn))

    onCleanup(() => unlisten?.())
  })

  const [formattedTotal] = createResource(totalBytes, (bytes: number) =>
    invoke<string>('format_size', { bytes })
  )
  const [formattedProcessed] = createResource(processedBytes, (bytes: number) =>
    invoke<string>('format_size', { bytes })
  )

  return (
    <div class="flex h-40 w-full shrink-0 flex-col rounded-md border border-(--border-secondary) bg-(--bg-card) p-1">
      {/*top*/}
      <div class="flex flex-row items-start justify-between">
        <div class="w-8/12 truncate rounded-sm border border-(--border-secondary) bg-(--bg-secondary) pl-1 text-[0.75rem]">
          {file()}
        </div>
        <button
          class="transition-color flex h-7 w-7 items-center justify-center rounded-sm border border-(--border-secondary) duration-150 hover:bg-(--accent-danger)"
          onClick={() => props.onCancel(props.opId)}
        >
          <X class='size-3' />
        </button>
      </div>
      {/*middle*/}
      <div class="flex flex-row gap-2">
        <Show when={elapsedSecs() > 0}>
          <div class="pl-0.5 text-[0.70rem]">Tempo: {elapsedSecs().toFixed(1)}s</div>
        </Show>
      </div>
      {/*bottom*/}
      <div class="flex h-full w-full flex-col justify-end">
        <div class="flex flex-row pl-1">
          <div class="text-[0.75rem]">{Math.floor(percent())}%</div>
          <div class="flex w-full flex-row justify-end">
            <div class="mr-1 text-[0.75rem]">
              {formattedProcessed()} De {formattedTotal()}
            </div>
          </div>
        </div>
        <div class="trasparent flex h-1.5 w-full flex-row gap-0.5 overflow-hidden">
          <div
            class="h-full rounded-full bg-(--accent-glow) transition-[width] ease-in-out"
            style={{ width: Math.floor(percent()) + '%' }}
          />
          <div class="h-full flex-1 rounded-full bg-(--bg-primary) transition-[width] ease-in-out" />
        </div>
      </div>
    </div>
  )
}
