import { For, type JSX, createMemo, onMount } from 'solid-js'
import { useNavigationStore } from '@/stores/NavigationStore'
import { useFileStore } from '@/stores/FileStore'
import { ArrowFatDown, ComputerTower, HouseLine, TrashSimple } from 'phosphor-solid'
import { useDiskStore } from '@/stores/DiskStore'
import { useSidebarItemsStore } from '@/stores/SidebarItemsStore'


type IconComponent = (...args: any[]) => JSX.Element

export function SideBar() {
  const nav = useNavigationStore()
  const fil = useFileStore()
  const disk = useDiskStore()
  const sidebar = useSidebarItemsStore()

  const local_icons = createMemo(
    () =>
      ({
        Home: [HouseLine, nav.home],
        Download: [ArrowFatDown, nav.home + '/Downloads'],
        Trash: [TrashSimple, nav.home + '/.local/share/Trash/files'],
      }) as Record<string, [IconComponent, string]>
  )

  const allItems = createMemo(() => [
    ...Object.entries(local_icons()),
    ...sidebar.items.map((i) => [i.name, [i.icon, i.path]] as const),
  ])

  onMount(() => {
    disk.initDisks()
  })

  return (
    <div class="flex h-full w-34 flex-col shrink-0">
      <For each={allItems()}>
        {([name, [Icon, path]]) => (
          <div class="flex items-center">
            <button
              class="h-7 w-full hover:bg-[var(--bg-hover-secondary)]"
              onClick={() => {
                nav.goPath(path)
                fil.resetSelected()
              }}
            >
              <div class="ml-0.5 flex h-full items-center gap-1.5 text-[0.9rem]">
                <Icon size={20} weight="duotone" class="shrink-0"/>
                <span class="truncate">{name}</span>
              </div>
            </button>
          </div>
        )}
      </For>

      <div class='p-0.5 flex flex-row w-full h-auto items-center justify-center'><div class='w-4/5 h-px bg-[var(--border-primary)] shrink-0'/></div>
      <For each={disk.disks}>
        {(d) => (
          <div class="flex w-full flex-col overflow-ellipsis whitespace-nowrap">
            <For each={d.partitions}>
              {(p) => {
                return (
                  <button
                    class="h-7 w-full hover:bg-[var(--bg-hover-secondary)]"
                    onClick={async () => {
                      let mountPoint = p.mount_point
                      if (!p.is_mounted) {
                        const result = await disk.mountDisk(p.object_path)
                        if (!result) return
                        mountPoint = result
                      }
                      nav.goPath(mountPoint)
                      fil.resetSelected()
                    }}
                  >
                    <div class="ml-0.5 flex h-full items-center gap-1.5 text-[0.9rem]">
                      <ComputerTower size={20} weight="duotone" class="shrink-0"/>
                      <span class="truncate">
                        {p.is_mounted ? fil.lastPathSegment(p.mount_point) : d.name}
                      </span>
                      {fil.formatSize(p.available_space)}
                    </div>
                  </button>
                )
              }}
            </For>
          </div>
        )}
      </For>
    </div>
  )
}
