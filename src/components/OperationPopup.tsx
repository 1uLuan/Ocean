// src/components/OperationPopup.tsx
import { Show, createSignal } from 'solid-js'
import X from '~icons/ph/x'
import { useOperationStore, type OpKind, type OpProgress } from '@/stores/OperationStore'

const LABEL: Record<OpKind, string> = {
  copy: 'Copiando',
  move: 'Movendo',
  compress: 'Compactando',
  extract: 'Extraindo',
}

// Sem IPC: formatação local para não sobrecarregar a bridge do Tauri
function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(1))} ${units[i]}`
}

function formatEta(secs: number): string {
  if (!isFinite(secs) || secs <= 0) return ''
  if (secs < 60) return `${Math.ceil(secs)}s`
  return `${Math.floor(secs / 60)}m ${Math.ceil(secs % 60)}s`
}

const [open, setOpen] = createSignal(false)

export function OperationPopup(props: { op: OpProgress }) {
  const store = useOperationStore()

  const eta = () =>
    props.op.bytes_per_sec > 0
      ? formatEta((props.op.total_bytes - props.op.processed_bytes) / props.op.bytes_per_sec)
      : ''
  return (
    <div class="absolute bottom-9 left-40 z-40 flex w-60 shrink-0 flex-col gap-1 rounded-md border border-(--border-secondary) bg-(--bg-card) p-1.5">
      <div class="flex flex-row items-center gap-1">
        <span class="flex-1 truncate text-[0.75rem]">
          {LABEL[props.op.kind]} {props.op.file}
        </span>
        <button
          class="flex h-6 w-6 items-center justify-center rounded-sm border border-(--border-secondary) hover:bg-(--accent-danger)"
          onClick={() => store.cancelOperation(props.op.op_id)}
        >
          <X class="size-3" />
        </button>
      </div>

      <div class="flex flex-row justify-between text-[0.7rem]">
        <span>{Math.floor(props.op.percent)}%</span>
        <Show when={props.op.total_items > 1}>
          <span>
            {props.op.current_item}/{props.op.total_items}
          </span>
        </Show>
      </div>

      <div class="flex flex-row justify-between text-[0.7rem] text-(--text-secondary)">
        <span>
          {formatBytes(props.op.processed_bytes)} / {formatBytes(props.op.total_bytes)}
        </span>
        <Show when={props.op.bytes_per_sec > 0}>
          <span>
            {formatBytes(props.op.bytes_per_sec)}/s {eta() && `· ${eta()}`}
          </span>
        </Show>
      </div>

      <div class="h-1.5 w-full overflow-hidden rounded-full bg-(--bg-primary)">
        <div
          class="h-full rounded-full bg-(--accent-primary) transition-[width] duration-100"
          style={{ width: `${props.op.percent}%` }}
        />
      </div>
    </div>
  )
}
