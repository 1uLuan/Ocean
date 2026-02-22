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
    <div class="flex h-full">
      <div class="flex flex-none shrink-0 flex-col overflow-hidden pt-[1px] pl-[2px]">
        <For each={Object.entries(local_icons())}>
          {([name, [Icon, path]]) => (
            <li class="flex items-center">
              <button
                type="button"
                class="h-[30px] w-full rounded-md hover:bg-[var(--bg-hover-primary)]"
                onClick={() => {
                  nav.goPath(path)
                  fil.resetSelected()
                }}
              >
                <div class="flex h-full items-center gap-1.5 pl-1.5 text-[14px]">
                  <Icon />
                  {name}
                </div>
              </button>
            </li>
          )}
        </For>
      </div>
    </div>
  )
}
