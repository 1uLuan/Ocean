import { For, type JSX, createMemo, onMount, Show } from 'solid-js'
import { useNavigationStore } from '@/stores/NavigationStore'
import { useFileStore } from '@/stores/FileStore'
import { ArrowFatDown, ComputerTower, HouseLine, TrashSimple, Eject, GameController } from 'phosphor-solid'
import { useDiskStore } from '@/stores/DiskStore'
import { useSidebarItemsStore } from '@/stores/SidebarItemsStore'
import { useContextMenuStore } from '@/stores/ContextMenuStore'


type IconComponent = (...args: any[]) => JSX.Element

export function SideBar() {
  const nav = useNavigationStore()
  const fil = useFileStore()
  const disk = useDiskStore()
  const sidebar = useSidebarItemsStore()
  const cont = useContextMenuStore()

  const local_icons = createMemo(
    () =>
      ({
        Home: [HouseLine, nav.home],
        Download: [ArrowFatDown, nav.home + '/Downloads'],
        Game: [GameController, nav.home + '/Games'],
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
                class={`h-8 w-full hover:bg-[var(--bg-hover-secondary)] ${
                  fil.isSelected(path) && fil.placeIsSelected
                    ? 'bg-[var(--bg-hover-secondary)]'
                    : 'hover:bg-[var(--bg-hover-primary)]'
                }`}
              onClick={() => {
                nav.goPath(path)
                fil.resetSelected()
              }}
              onContextMenu={(e) => {
                fil.setPlaceIsSelected(true)
                fil.setSelected([path])
                cont.handleContextMenu(e)
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

      <div class='p-0.5 flex flex-col w-full h-auto items-center justify-center'>
        <div class='w-4/5 h-px bg-[var(--border-primary)] shrink-0' />
        <div class='text-[0.9rem]'>Dispositivos</div>
      </div>
      <For each={disk.disks.slice().sort((a, b) => Number(a.is_removable) - Number(b.is_removable))}>
        {(d) => {
          return (
            <div class="flex w-full flex-col overflow-ellipsis whitespace-nowrap">
              <For each={d.partitions.filter((p) => p.mount_point !== "/boot")}>
                {(p) => (
                  <button
                    class={`h-8 w-full hover:bg-[var(--bg-hover-secondary)] ${
                      fil.isSelected(p.mount_point) && fil.placeIsSelected
                        ? 'bg-[var(--bg-hover-secondary)]'
                        : 'hover:bg-[var(--bg-hover-primary)]'
                    }`}
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
                    onContextMenu={(e) => {
                      fil.setPlaceIsSelected(true)
                      fil.setSelected([p.mount_point])
                      cont.handleContextMenu(e)
                    }}
                  >
                    <div class='flex flex-row'>
                      <div class="ml-0.5 flex h-full items-center gap-1.5 text-[0.9rem]">
                        <ComputerTower size={20} weight="duotone" class="shrink-0" />
                        <span class="truncate">
                          {p.is_mounted ? fil.lastPathSegment(p.mount_point) : d.name}
                        </span>
                      </div>
                      <Show when={p.is_mounted && d.is_removable}>
                        <div class="w-full h-full flex justify-end">
                          <div class='w-6 h-6 hover:bg-[var(--accent-danger)] flex items-center justify-center rounded-sm'
                            onClick={() => disk.ejectDisk(p.object_path, d.drive_object_path)}
                          >
                            <Eject />
                          </div>
                        </div>
                      </Show>
                    </div>
                  </button>
                )}
              </For>
            </div>
          )
        }}
      </For>
    </div>
  )
}
