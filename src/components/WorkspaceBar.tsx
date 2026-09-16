import { useSmoothScroll } from '@/hooks/useSmoothScroll'
import { useNavigationStore } from '@/stores/NavigationStore'
import { useFileStore } from '@/stores/FileStore'
import { createSignal, For, Match, onMount, Switch} from 'solid-js'
//icons
import X from '~icons/ph/x'
import FolderOpen from '~icons/ph/folder-fill'
import ArrowCircleDown from '~icons/ph/arrow-circle-down-fill'
import HouseLine from "~icons/ph/house-line-fill"
import TrashSimple from "~icons/ph/trash-simple-fill"

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
      <For each={nav.workspaces}>
        {(path, i) => {
          const isActive = () => i() === nav.actualWorkspace
            return(
              <button
                class="group flex flex-row h-full border-r border-(--border-primary) gap-1 w-auto min-w-28 max-w-62 p-1 text-[0.8rem]"
                classList={{
                  'bg-(--bg-primary)' : isActive(),
                  'border-b' : !isActive()
                }}
                title={path}
                onClick={() => {
                  nav.setActualWorkspace(i())
                  fil.setReload(!fil.reload)
                }}
                onAuxClick={(e) => {
                  if (e.button === 1) nav.removeWorkspace(i())
                }}
              >
                <div class='h-full flex items-center justify-center'>
                  <Switch fallback={<FolderOpen class='size-5 shrink-0'/>}>
                    <Match when={path === nav.home + "/Downloads" }>
                      <ArrowCircleDown class='size-5 shrink-0'/>
                    </Match>
                    <Match when={path === nav.home}>
                      <HouseLine class='size-5 shrink-0'/>
                    </Match>
                    <Match when={path === nav.home + "/.local/share/Trash/files"}>
                      <TrashSimple class='size-5 shrink-0'/>
                    </Match>
                  </Switch>
                </div>
                <span class="ml-4 w-full min-w-0 truncate text-left">
                  {fil.lastPathSegment(path)}
                </span>
                <div
                  class="flex justify-end h-full items-center opacity-0 group-hover:opacity-100"
                  title="Fechar Aba"
                  onClick={(e) => {
                    e.stopPropagation()
                    nav.removeWorkspace(i())
                  }}
                >
                  <div class='rounded-sm hover:bg-(--bg-hover-secondary) w-5 h-5 flex items-center justify-center'>
                    <X class='size-3.5 shrink-0' />
                  </div>
                </div>

              </button>
            )}}
      </For>
      <div class='flex h-full flex-1 items-end'>
        <div class="h-px w-full bg-(--border-primary)"></div>
      </div>
    </div>
  )
}
