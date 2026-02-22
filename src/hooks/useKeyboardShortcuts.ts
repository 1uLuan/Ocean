// src/hooks/useKeyboardShortcuts.ts
import { onCleanup, onMount } from 'solid-js'
import { invoke } from '@tauri-apps/api/core'
import {
  SHORTCUTS,
  matchesKeyboardShortcut,
  matchesScrollShortcut,
  matchesMouseShortcut,
  ShortcutAction,
} from '@/utils/shortcuts'
import { useNavigationStore } from '@/stores/NavigationStore'
import { useFileStore } from '@/stores/FileStore'
import { useContextMenuStore } from '@/stores/ContextMenuStore'

export function useKeyboardShortcuts() {
  const fil = useFileStore()
  const cont = useContextMenuStore()
  const nav = useNavigationStore()

  onMount(() => {
    // ========== EXECUTAR AÇÃO DO ATALHO ==========
    const handleShortcutAction = (action: ShortcutAction) => {
      console.log('Atalho acionado:', action)

      switch (action) {
        case 'copy':
          if (fil.selectedFiles.length > 0) fil.setCopySelected(fil.selectedFiles)
          break

        case 'paste':
          if (fil.copySelected.length > 0 || fil.cutSelected.length > 0) cont.pasteDir()
          break

        case 'delete':
          if (fil.selectedFiles.length > 0) {
            invoke('move_to_trash', { dirPath: fil.selectedFiles })
              .then(() => {
                fil.resetSelected()
                fil.setReload(!fil.reload)
              })
              .catch((err) => console.error('Erro ao deletar:', err))
          }
          break

        case 'refresh':
          fil.setReload(!fil.reload)
          break

        // ========== WORKSPACES ==========
        case 'workspace_1':
          nav.setActualWorkspace(0)
          fil.setReload(!fil.reload)
          break
        case 'workspace_2':
          nav.setActualWorkspace(1)
          fil.setReload(!fil.reload)
          break
        case 'workspace_3':
          nav.setActualWorkspace(2)
          fil.setReload(!fil.reload)
          break
        case 'workspace_4':
          nav.setActualWorkspace(3)
          fil.setReload(!fil.reload)
          break

        // ========== SCROLL WORKSPACES ==========
        case 'next_workspace': {
          const next = ((nav.actualWorkspace + 1) % 4) as 0 | 1 | 2 | 3
          nav.setActualWorkspace(next)
          fil.setReload(!fil.reload)
          break
        }
        case 'prev_workspace': {
          const prev = ((nav.actualWorkspace - 1 + 4) % 4) as 0 | 1 | 2 | 3
          nav.setActualWorkspace(prev)
          fil.setReload(!fil.reload)
          break
        }

        // ========== NAVEGAÇÃO ==========
        case 'go_back':
          nav.goBackPath()
          break

        case 'go_forward':
          nav.goNextPath()
          break

        case 'open_terminal':
          invoke('open_terminal', { path: nav.path }).catch((err) =>
            console.error('Erro ao abrir terminal:', err)
          )
          break

        default:
          console.warn('Ação não implementada:', action)
      }
    }

    // ========== HANDLER DE TECLADO ==========
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      for (const [action, shortcut] of Object.entries(SHORTCUTS)) {
        if (shortcut.type === 'keyboard' && matchesKeyboardShortcut(e, shortcut)) {
          e.preventDefault()
          handleShortcutAction(action as ShortcutAction)
          return
        }
      }
    }

    // ========== HANDLER DE SCROLL ==========
    const handleWheel = (e: WheelEvent) => {
      for (const [action, shortcut] of Object.entries(SHORTCUTS)) {
        if (shortcut.type === 'scroll' && matchesScrollShortcut(e, shortcut)) {
          e.preventDefault()
          handleShortcutAction(action as ShortcutAction)
          return
        }
      }
    }

    // ========== HANDLER DE BOTÕES DO MOUSE ==========
    const handleMouseDown = (e: MouseEvent) => {
      for (const [action, shortcut] of Object.entries(SHORTCUTS)) {
        if (shortcut.type === 'mouse' && matchesMouseShortcut(e, shortcut)) {
          e.preventDefault()
          handleShortcutAction(action as ShortcutAction)
          return
        }
      }
    }

    // Adicionar listeners
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('wheel', handleWheel, { passive: false })
    window.addEventListener('mousedown', handleMouseDown)

    onCleanup(() => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('wheel', handleWheel)
      window.removeEventListener('mousedown', handleMouseDown)
    })
  })
}

export default useKeyboardShortcuts
