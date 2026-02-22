import { createEffect, onMount, For, Show, createMemo } from 'solid-js'
import { invoke } from '@tauri-apps/api/core'
import { useContextMenuStore } from '../stores/ContextMenuStore.ts'
import { useConfigStore } from '../stores/ConfigStore.ts'
import { useFileStore } from '../stores/FileStore.ts'
import { useNavigationStore } from '@/stores/NavigationStore.ts'
import { usePopupControl } from '@/stores/PopupControl.ts'
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
} from 'phosphor-solid'

export function ContextMenu() {
  const fil = useFileStore()
  const cont = useContextMenuStore()
  const nav = useNavigationStore()
  const pop = usePopupControl()
  const conf = useConfigStore()

  const btnList = createMemo(() => [
    {
      label: 'Make New',
      icon: <CaretRight weight="light" />,
      onClick: undefined,
      onMouseEnter: () => cont.setShowDirMenu(true),
      disabled: false,
    },
    {
      label: 'Rename',
      icon: <PenNib weight="light" />,
      onClick: () => {
        cont.setOnEnter(cont.handleRename)
        cont.openPopup()
      },
      onMouseEnter: () => cont.setShowDirMenu(false),
      disabled: false,
    },
    {
      label: 'Copy',
      icon: <Copy weight="light" />,
      onClick: () => {
        fil.setCopySelected(fil.selectedFiles)
      },
      onMouseEnter: () => cont.setShowDirMenu(false),
      disabled: false,
    },
    {
      label: 'Cut',
      icon: <Scissors weight="light" />,
      onClick: () => {
        fil.setCutSelected(fil.selectedFiles)
      },
      onMouseEnter: () => cont.setShowDirMenu(false),
      disabled: false,
    },
    {
      label: 'Paste',
      icon: <Clipboard weight="light" />,
      onClick: async () => {
        if (fil.cutSelected.length > 0) {
          cont.moveDir()
        } else {
          cont.pasteDir()
        }
      },
      onMouseEnter: () => cont.setShowDirMenu(false),
      disabled: fil.copySelected.length === 0 && fil.cutSelected.length === 0,
    },
    {
      label:
        nav.workspaces[nav.actualWorkspace] === nav.home + '/.local/share/Trash/files'
          ? 'Delete'
          : 'Move To Trash',
      icon: <Trash weight="light" />,
      onClick: () => {
        if (nav.workspaces[nav.actualWorkspace] === nav.home + '/.local/share/Trash/files') {
          pop.setWarningPopup(true)
          //delele() in warningPopup
        } else {
          cont.moveToTrash()
        }
      },
      onMouseEnter: () => cont.setShowDirMenu(false),
      disabled: false,
    },
    {
      label: conf.config.toggle_hidden_files ? 'Hide Hidden Files' : 'Show Hidden Files',
      icon: conf.config.toggle_hidden_files ? <EyeSlash weight="light" /> : <Eye weight="light" />,
      onClick: () => {
        conf.toggleHiddenFiles()
        fil.setReload(!fil.reload)
        console.log(fil.reload)
      },
      onMouseEnter: () => cont.setShowDirMenu(false),
      disabled: false,
    },
    {
      label: 'Open Terminal',
      icon: <TerminalWindow weight="light" />,
      onClick: async () => {
        try {
          await invoke('open_terminal', { path: nav.path })
        } catch (error) {
          console.log(error)
        }
      },
      onMouseEnter: () => cont.setShowDirMenu(false),
      disabled: false,
    },
  ])

  onMount(() => {
    function disableContextMenu(e: MouseEvent) {
      return e.preventDefault()
    }
    window.addEventListener('contextmenu', disableContextMenu)
    return () => window.removeEventListener('contextmenu', disableContextMenu)
  })
  onMount(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') cont.setShowMenu(false)
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  })

  createEffect(() => {
    console.log(fil.selectedFiles)
    console.log(fil.copySelected)
  }, [fil.selectedFiles, fil.copySelected])

  return (
    <Show when={cont.showMenu && cont.menuPos}>
      <div
        data-component="Menu-Overlay"
        class="fixed inset-0 z-40 h-screen w-screen bg-transparent"
        onMouseDown={(e) => {
          if (e.button === 2) {
            return
          } else cont.setShowMenu(false)
          cont.setShowDirMenu(false)
        }}
        onContextMenu={() => {
          cont.setShowMenu(false)
          cont.setShowDirMenu(false)
        }}
      />
      <div
        data-component="Context-Menu"
        class="absolute z-50 flex w-[250px] flex-col rounded-md border border-[var(--border-secondary)] bg-[var(--bg-tertiary)] p-[4px] shadow-[var(--shadow-md)]"
        style={{
          top: `${Math.min(cont.menuPos!.y - 0, window.innerHeight - 275)}px`,
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
              <Show when={['Move To Trash', 'Delete'].includes(item.label)}>
                <div class="h-[1px] w-[100%] bg-[var(--text-muted)]" />
                <div class="h-1" />
              </Show>
              <button
                class={`flex h-[25px] w-full items-center rounded-md text-[12px] ${
                  item.disabled
                    ? 'text-[var(--text-muted)]'
                    : 'hover:bg-[var(--bg-hover-secondary)]'
                }`}
                onClick={item.onClick}
                onMouseEnter={item.onMouseEnter}
                disabled={item.disabled}
              >
                <div class="flex flex-row items-center gap-1 pl-2.5">
                  {item.icon} {item.label}
                </div>
              </button>
              <Show when={['Move To Trash', 'Delete'].includes(item.label)}>
                <div class="h-1" />
                <div class="h-[1px] w-[100%] bg-[var(--text-muted)]" />
              </Show>
            </>
          )}
        </For>
        <Show when={cont.showDirMenu && cont.menuPos && cont.showMenu}>
          <div
            class="absolute z-50 flex w-[250px] flex-col rounded-md border border-[var(--border-secondary)] bg-[var(--bg-tertiary)] p-1 shadow-[var(--shadow-md)]"
            style={{
              top: '0px',
              left: `${cont.menuPos!.x > window.innerWidth - 380 ? -125 : 252}px`,
              'z-index': '50',
              width: '120px',
            }}
          >
            <div
              class="flex h-[25px] w-full items-center rounded-md text-[12px] hover:bg-[var(--bg-hover-secondary)]"
              onClick={() => {
                cont.setOnEnter(cont.makeDir)
                cont.openPopup()
              }}
            >
              <div class="flex flex-row items-center gap-1 pl-2.5">
                <FolderSimple /> Folder
              </div>
            </div>
            <div
              class="flex h-[25px] w-full items-center rounded-md text-[12px] hover:bg-[var(--bg-hover-secondary)]"
              onClick={() => {
                cont.setOnEnter(cont.makeFile)
                cont.openPopup()
              }}
            >
              <div class="flex flex-row items-center gap-1 pl-2.5">
                <File /> File
              </div>
            </div>
          </div>
        </Show>
      </div>
    </Show>
  )
}
