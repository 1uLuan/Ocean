import { For, type JSX, createMemo } from 'solid-js'
import { useNavigationStore } from '@/stores/NavigationStore'
import { useFileStore } from '@/stores/FileStore'
import { ArrowFatDown, ComputerTower, HouseLine, TrashSimple } from 'phosphor-solid'

type IconComponent = (...args: any[]) => JSX.Element

export function SideBar() {
  const nav = useNavigationStore()
  const fil = useFileStore()
  const local_icons = createMemo(
    () =>
      ({
        Home: [HouseLine, nav.home],
        Download: [ArrowFatDown, nav.home + '/Downloads'],
        Trash: [TrashSimple, nav.home + '/.local/share/Trash/files'],
        Root: [ComputerTower, '/'],
      }) as Record<string, [IconComponent, string]>
  )

  return (
    <div class="flex h-full w-28 flex-col overflow-hidden">
      <For each={Object.entries(local_icons())}>
        {([name, [Icon, path]]) => (
          <li class="flex items-center">
            <button
              type="button"
              class="h-7 w-full hover:bg-[var(--bg-hover-secondary)]"
              onClick={() => {
                nav.goPath(path)
                fil.resetSelected()
              }}
            >
              <div class="ml-0.5 flex h-full items-center gap-1.5 text-[0.9rem]">
                <Icon />
                {name}
              </div>
            </button>
          </li>
        )}
      </For>
    </div>
  )
}
