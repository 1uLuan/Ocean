import { useSmoothScroll } from '@/hooks/useSmoothScroll'
import { useNavigationStore } from '@/stores/NavigationStore'
import { useFileStore } from '@/stores/FileStore'
import { createSignal, For, onMount } from 'solid-js'
import X from '~icons/ph/x'
import FolderOpen from '~icons/ph/folder-open-duotone'

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
      class="scrollbar-none flex h-9 w-full flex-row overflow-x-scroll overflow-y-hidden bg-(--bg-secondary)"
    >
      <For each={Object.entries(nav.workspaces)}>
        {([idx]) => (
          <button
            class={`flex flex-row h-full border-r border-(--border-primary) gap-1 w-auto min-w-24 max-w-62 p-1 text-[0.8rem] ${
              Number(idx) === nav.actualWorkspace
                ? 'bg-(--bg-primary)'
                : 'border-b '
            }`}
            onClick={() => {
              nav.setActualWorkspace(Number(idx))
              fil.setReload(!fil.reload)
            }}
          >
            <div class='h-full flex items-center justify-center'> <FolderOpen class='size-5 shrink-0'/> </div>
            <div class="ml-1.5 w-full min-w-0 truncate text-left">
              {fil.lastPathSegment(nav.workspaces[Number(idx)])}
            </div>
            <div class="flex justify-end h-full items-center"
              onClick={() => nav.removeWorkspace(Number(idx))}
            >
              <div class='rounded-sm hover:bg-(--bg-hover-secondary) w-5 h-5 flex items-center justify-center'><X class='size-3.5 shrink-0' /></div>
            </div>

          </button>
        )}
      </For>
      <div class='flex h-full flex-1 items-end'>
        <div class="h-px w-full bg-(--border-primary)"></div>
      </div>
    </div>
  )
}
