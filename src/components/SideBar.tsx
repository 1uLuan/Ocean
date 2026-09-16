import { For, type JSX, createMemo, onMount, Show } from 'solid-js'
import { useNavigationStore } from '@/stores/NavigationStore'
import { useFileStore } from '@/stores/FileStore'
//icons
import ArrowFatDown from '~icons/ph/arrow-fat-down-duotone'
import HouseLine from '~icons/ph/house-line-duotone'
import TrashSimple from '~icons/ph/trash-simple-duotone'
import Eject from '~icons/ph/eject-duotone'
import Ssd from '~icons/solar/ssd-round-bold-duotone'

import { useDiskStore } from '@/stores/DiskStore'
import { useSidebarItemsStore } from '@/stores/SidebarItemsStore'
import { useContextMenuStore } from '@/stores/ContextMenuStore'
import { CompressPopup } from './CompressPopup'
import { CopyPopup } from './CopyPopup'
import { usePopupControl } from '@/stores/PopupControl'

type IconComponent = (...args: any[]) => JSX.Element

export function SideBar() {
  const nav = useNavigationStore()
  const fil = useFileStore()
  const disk = useDiskStore()
  const sidebar = useSidebarItemsStore()
  const cont = useContextMenuStore()
  const pop = usePopupControl()
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
    <div class="flex h-full w-38 shrink-0 flex-col">
      <For each={allItems()}>
        {([name, [Icon, path]]) => (
          <div class="flex items-center">
            <button
              class={`h-8 w-full hover:bg-(--bg-hover-secondary) ${
                fil.isSelected(path) && fil.placeIsSelected
                  ? 'bg-(--bg-hover-secondary)'
                  : 'hover:bg-(--bg-hover-primary)'
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
                <Icon class="size-5 shrink-0" />
                <span class="truncate">{name}</span>
              </div>
            </button>
          </div>
        )}
      </For>

      <div class="flex h-auto w-full flex-col items-center justify-center p-0.5">
        <div class="h-px w-10/12 shrink-0 bg-(--border-primary)" />
        <div class="text-[0.9rem]">Dispositivos</div>
      </div>
      <For each={disk.disks.toSorted((a, b) => Number(a.is_removable) - Number(b.is_removable))}>
        {(d) => {
          return (
            <div class="flex w-full flex-col text-ellipsis whitespace-nowrap">
              <For each={d.partitions.filter((p) => p.mount_point !== '/boot')}>
                {(p) => (
                  <button
                    class={`h-8 w-full hover:bg-(--bg-hover-secondary) ${
                      fil.isSelected(p.mount_point) && fil.placeIsSelected
                        ? 'bg-(--bg-hover-secondary)'
                        : 'hover:bg-(--bg-hover-primary)'
                    }`}
                    title={fil.formatSize(p.available_space).toString()}
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
                    <div class="flex flex-row">
                      <div class="ml-0.5 flex h-full items-center gap-1.5 text-[0.9rem]">
                        <Ssd class="size-5 shrink-0" />
                        <span class="truncate">
                          {p.is_mounted ? fil.lastPathSegment(p.mount_point) : d.name}
                        </span>
                      </div>
                      <Show when={p.is_mounted && d.is_removable}>
                        <div class="flex h-full w-full justify-end">
                          <div
                            class="flex h-6 w-6 items-center justify-center rounded-sm hover:bg-(--accent-danger)"
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
      <div class="flex h-full w-full flex-col justify-end p-1.5">
        <For each={pop.compressions}>
          {(id) => (
            <>
              <CompressPopup opId={id} onCancel={pop.cancelCompress} />
            </>
          )}
        </For>
        <For each={pop.copies}>
          {(id) => (
            <>
              <CopyPopup copyId={id} onCancel={pop.cancelCopy} />
            </>
          )}
        </For>
      </div>
    </div>
  )
}
