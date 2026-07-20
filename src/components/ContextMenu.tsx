import { For, Show, createMemo } from 'solid-js'
import { invoke } from '@tauri-apps/api/core'
import { useContextMenuStore } from '../stores/ContextMenuStore.ts'
import { useConfigStore } from '../stores/ConfigStore.ts'
import { useFileStore } from '../stores/FileStore.ts'
import { useNavigationStore } from '@/stores/NavigationStore.ts'
import { usePopupControl } from '@/stores/PopupControl.ts'
import { useSidebarItemsStore } from '@/stores/SidebarItemsStore.ts'
import {
  Copy,
  CaretRight,
  PenNib,
  Clipboard,
  Trash,
  Eye,
  TerminalWindow,
  FolderSimple,
  EyeSlash,
  Scissors,
  File,
  ArchiveBox,
  Archive,
} from 'phosphor-solid'

export function ContextMenu() {
  const fil = useFileStore()
  const cont = useContextMenuStore()
  const nav = useNavigationStore()
  const pop = usePopupControl()
  const conf = useConfigStore()
  const sidebar = useSidebarItemsStore()

  const disabledPrefixes = [
    "/", "/bin", "/boot", "/dev", "/etc", "/home", "/lib", "/lib64",
    "/lost+found", "/mnt", "/opt", "/proc", "/root", "/run",
    "/sbin", "/srv", "/sys", "/tmp", "/usr", "/var",
  ]

  function isDisabledPath(path: string): boolean {
    if (!path) return false
    if (path.startsWith("/home/") || path.startsWith("/run/media/" + fil.lastPathSegment(nav.home) + "/")) return false
    return disabledPrefixes.some((prefix) =>
      prefix === "/" ? path === "/" : path === prefix || path.startsWith(prefix + "/")
    )
  }

  const btnList = createMemo(() => [
    {
      label: 'Make New',
      icon: <CaretRight weight="regular" />,
      onClick: undefined,
      onMouseEnter: () => cont.setShowDirMenu(true),
      disabled: isDisabledPath(fil.selectedFiles.length === 1 ? fil.selectedFiles[0] : nav.path),
      visible: !fil.placeIsSelected && fil.selectedFiles.length === 0 ||
        (fil.selectedFiles.length === 1 &&
          fil.files.find(f => f.path === fil.selectedFiles[0])?.ftype === "folder"),
    },
    {
      label: 'Rename',
      icon: <PenNib weight="regular" />,
      onClick: () => {
        cont.openRenamePopup()
      },
      onMouseEnter: () => cont.setShowDirMenu(false),
      disabled: isDisabledPath(nav.path),
      visible: !fil.placeIsSelected && fil.selectedFiles.length > 0,
    },
    {
      label: 'Copy',
      icon: <Copy weight="regular" />,
      onClick: () => {
        fil.setCopySelected(fil.selectedFiles)
      },
      onMouseEnter: () => cont.setShowDirMenu(false),
      disabled: isDisabledPath(nav.path),
      visible: fil.selectedFiles.length > 0,
    },
    {
      label: 'Cut',
      icon: <Scissors weight="regular" />,
      onClick: () => {
        fil.setCutSelected(fil.selectedFiles)
      },
      onMouseEnter: () => cont.setShowDirMenu(false),
      disabled: isDisabledPath(nav.path),
      visible: !fil.placeIsSelected && fil.selectedFiles.length > 0,
    },
    {
      label: 'Paste',
      icon: <Clipboard weight="regular" />,
      onClick: async () => {
        if (fil.cutSelected.length > 0) {
          cont.moveDir()
        } else {
          cont.pasteDir()
        }
      },
      onMouseEnter: () => cont.setShowDirMenu(false),
      disabled: isDisabledPath(fil.selectedFiles.length === 1 ? fil.selectedFiles[0] : nav.path),
      visible: fil.copySelected.length || fil.cutSelected.length,
    },
    {
      label:
        nav.workspaces[nav.actualWorkspace] === nav.home + '/.local/share/Trash/files'
          ? 'Delete'
          : 'Move To Trash',
      icon: <Trash weight="regular" />,
      onClick: () => {
        if (fil.selectedFiles.length > 0) {
          if (nav.workspaces[nav.actualWorkspace] === nav.home + '/.local/share/Trash/files') {
            pop.setWarningPopup(true)
            //delele() in warningPopup
          } else {
            cont.moveToTrash()
          }
        }
      },
      onMouseEnter: () => cont.setShowDirMenu(false),
      disabled: isDisabledPath(nav.path),
      visible: !fil.placeIsSelected && fil.selectedFiles.length > 0,
    },
    {
      label: conf.config.toggle_hidden_files ? 'Hide Hidden Files' : 'Show Hidden Files',
      icon: conf.config.toggle_hidden_files ? (
        <EyeSlash weight="regular" />
      ) : (
        <Eye weight="regular" />
      ),
      onClick: () => {
        conf.toggleHiddenFiles()
        fil.setReload(!fil.reload)
        console.log(fil.reload)
      },
      onMouseEnter: () => cont.setShowDirMenu(false),
      disabled: false,
      visible: !fil.placeIsSelected,
    },
    {
      label: 'Open Terminal',
      icon: <TerminalWindow weight="regular" />,
      onClick: async () => {
        try {
          await invoke('open_terminal', { path: fil.selectedFiles.length === 1 ? fil.selectedFiles[0] : nav.path })
        } catch (error) {
          console.log(error)
        }
      },
      onMouseEnter: () => cont.setShowDirMenu(false),
      disabled: false,
      visible: true,
    },
    {
      label: 'Compress To Zip',
      icon: <ArchiveBox weight="regular" />,
      onClick: () => {
        cont.setOnEnter(cont.compressToZip)
        cont.openPopup()
      },
      onMouseEnter: () => cont.setShowDirMenu(false),
      disabled: isDisabledPath(nav.path),
      visible: !fil.placeIsSelected && fil.selectedFiles.length > 0,
    },
    {
      label: 'Extract Zip Here',
      icon: <Archive weight="regular" />,
      onClick: () => {
        cont.extractZip()
      },
      onMouseEnter: () => cont.setShowDirMenu(false),
      disabled: isDisabledPath(nav.path),
      visible: !fil.placeIsSelected && fil.selectedFiles.length > 0,
    },
    {
      label: 'Add To Places',
      icon: <Archive weight="regular" />,
      onClick: () => sidebar.addItem(fil.selectedFiles.length === 1 ? fil.selectedFiles[0] : nav.path),
      onMouseEnter: () => cont.setShowDirMenu(false),
      disabled: false,
      visible: !fil.placeIsSelected,
    },
    {
      label: 'Remove From Places',
      icon: <Archive weight="regular" />,
      onClick: () => sidebar.removeItem(fil.lastPathSegment(fil.selectedFiles[0])),
      onMouseEnter: () => cont.setShowDirMenu(false),
      disabled: false,
      visible: fil.placeIsSelected,
    },
  ])

  return (
    <Show when={cont.showMenu && cont.menuPos}>
      <div
        data-component="Menu-Overlay"
        class="fixed inset-0 z-40 h-screen w-screen bg-transparent"
        onMouseDown={(e) => {
          if (e.button === 2) {
            fil.resetSelected()
            fil.resetInterval()
            return
          }
          cont.setShowMenu(false)
          cont.setShowDirMenu(false)
          fil.resetSelected()
          fil.resetInterval()
          fil.setPlaceIsSelected(false)
        }}
        onContextMenu={() => {
          cont.setShowMenu(false)
          cont.setShowDirMenu(false)

        }}
      />
      <div
        data-component="Context-Menu"
        class="absolute z-50 flex w-64 flex-col rounded-md border border-[var(--border-primary)] bg-[var(--bg-modal)] p-1 shadow-[var(--shadow-md)]"
        style={{
          top: `${Math.min(cont.menuPos!.y - 0, window.innerHeight - 370)}px`,
          left: `${Math.min(cont.menuPos!.x + 3, window.innerWidth - 260)}px`,
        }}
        onClick={() => {
          cont.setShowMenu(false)
          cont.setShowDirMenu(false)
        }}
      >
        <For each={btnList()}>
          {(item) => (
            <>
              <Show when={item.visible}>
                <Show when={['Move To Trash', 'Delete',].includes(item.label)}>
                  <div class="h-[1px] w-full bg-[var(--border-secondary)]" />
                  <div class="h-1" />
                </Show>

                <button class={`flex h-7 w-full items-center rounded-md text-[0.75rem] ${
                  item.disabled ? 'text-[var(--text-muted)]' : 'hover:bg-[var(--bg-card-hover)]'
                  }`}
                  onClick={() => {
                    fil.setPlaceIsSelected(false)
                    item.onClick?.()
                    fil.resetSelected()
                    fil.resetInterval()
                  }}
                  onMouseEnter={() => {if (!item.disabled) item.onMouseEnter?.()}}
                  disabled={item.disabled}
                >
                  <div class="flex flex-row items-center gap-1 pl-2.5">
                    {item.icon} {item.label}
                  </div>
                </button>

                <Show when={['Move To Trash', 'Delete'].includes(item.label)}>
                  <div class="h-1" />
                  <div class="h-[1px] w-full bg-[var(--border-secondary)]" />
                </Show>
              </Show>
            </>
          )}
        </For>
        <Show when={cont.showDirMenu && cont.menuPos && cont.showMenu}>
          <div
            class="absolute z-50 flex flex-col rounded-md border border-[var(--border-primary)] bg-[var(--bg-modal)] p-1 shadow-[var(--shadow-md)]"
            style={{
              top: '0px',
              left: `${cont.menuPos!.x > window.innerWidth - 380 ? -122 : 256}px`,
              'z-index': '50',
              width: '120px',
            }}
          >
            <button
              class="flex h-7 w-full items-center rounded-md text-[0.75rem] hover:bg-[var(--bg-card-hover)]"
              onClick={() => {
                cont.setOnEnter(cont.makeDir)
                cont.openPopup()
              }}
            >
              <div class="flex flex-row items-center gap-1 pl-2.5">
                <FolderSimple weight="regular" /> Folder
              </div>
            </button>
            <button
              class="flex h-7 w-full items-center rounded-md text-[0.75rem] hover:bg-[var(--bg-card-hover)]"
              onClick={() => {
                cont.setOnEnter(cont.makeFile)
                cont.openPopup()
              }}
            >
              <div class="flex flex-row items-center gap-1 pl-2.5">
                <File weight="regular" /> File
              </div>
            </button>
          </div>
        </Show>
      </div>
    </Show>
  )
}
