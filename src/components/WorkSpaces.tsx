import { useNavigationStore } from '@/stores/NavigationStore.ts'
import { useFileStore } from '@/stores/FileStore'
import { For, type JSX } from 'solid-js'

export function WorkSpaces() {
  const nav = useNavigationStore()
  const fil = useFileStore()

  return (
    <div class="flx-col h-auto w-full gap-0.5 rounded-2xl">
      <For each={Object.entries(nav.workspaces)}>
        {([idx, name]) => (
          <button
            class={`h-10 w-full gap-0.5 border border-transparent hover:bg-[var(--bg-selection-soft)] ${nav.actualWorkspace === Number(idx) ? 'border-l-[var(--accent-primary)]' : ''}`}
            onClick={() => {
              nav.setActualWorkspace(Number(idx) as 0 | 1 | 2 | 3)
              fil.setReload(!fil.reload)
            }}
          >
            <div class="ml-2.5 flex items-center text-[0.8rem]">{name}</div>
          </button>
        )}
      </For>
    </div>
  )
}
