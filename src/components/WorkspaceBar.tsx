import { useSmoothScroll } from '@/hooks/useSmoothScroll'
import { useNavigationStore } from '@/stores/NavigationStore'
import { useFileStore } from '@/stores/FileStore'
import { createSignal, For, onMount } from 'solid-js'

export function WorkspaceBar() {
  const nav = useNavigationStore()
  const fil = useFileStore()

  const [listEl, setListEl] = createSignal<HTMLDivElement | null>(null)

  onMount(() => {
    const el = listEl()
    if (!el) return
    useSmoothScroll(() => el, {
      speed: 1.2,
      smoothness: 0.3,
    })
  })

  return (
    <div
      ref={setListEl}
      class="scrollbar-none flex h-auto w-full flex-row gap-px overflow-x-scroll overflow-y-hidden bg-[var(--border-primary)]"
    >
      <For each={Object.entries(nav.workspaces)}>
        {([idx]) => (
          <button
            class={`h-auto w-full min-w-24 overflow-hidden p-1.5 text-[0.8rem] text-ellipsis whitespace-nowrap ${
              Number(idx) === nav.actualWorkspace
                ? 'bg-[var(--bg-primary)]'
                : 'border-b border-b-[var(--border-primary)] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover-secondary)]'
            }`}
            onClick={() => {
              nav.setActualWorkspace(Number(idx))
              fil.setReload(!fil.reload)
            }}
          >
            {nav.workspaces[Number(idx)]}
          </button>
        )}
      </For>
    </div>
  )
}
