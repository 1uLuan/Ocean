// src/hooks/useKeyboardShortcuts.ts
import { useEffect } from 'react'
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
  const path = useNavigationStore((state) => state.path)
  const actualWorkspace = useNavigationStore((state) => state.actualWorkspace)
  const goBackPath = useNavigationStore((state) => state.goBackPath)
  const goNextPath = useNavigationStore((state) => state.goNextPath)
  const setActualWorkspace = useNavigationStore((state) => state.setActualWorkspace)

  const selectedFiles = useFileStore((state) => state.selectedFiles)
  const setCopySelected = useFileStore((state) => state.setCopySelected)
  const pasteDir = useContextMenuStore((state) => state.pasteDir)
  const resetSelected = useFileStore((state) => state.resetSelected)
  const reload = useFileStore((state) => state.reload)
  const setReload = useFileStore((state) => state.setReload)

  useEffect(() => {
    // ========== EXECUTAR AÇÃO DO ATALHO ==========
    const handleShortcutAction = (action: ShortcutAction) => {
      console.log('Atalho acionado:', action)

      switch (action) {
        case 'copy':
          if (selectedFiles.length > 0) setCopySelected(selectedFiles)
          break

        case 'paste':
          pasteDir()
          break

        case 'delete':
          if (selectedFiles.length > 0) {
            invoke('move_to_trash', { dirPath: selectedFiles })
              .then(() => {
                resetSelected()
                setReload(!reload)
              })
              .catch((err) => console.error('Erro ao deletar:', err))
          }
          break

        case 'refresh':
          setReload(!reload)
          break

        // ========== WORKSPACES ==========
        case 'workspace_1':
          setActualWorkspace(0)
          setReload(!reload)
          break
        case 'workspace_2':
          setActualWorkspace(1)
          setReload(!reload)
          break
        case 'workspace_3':
          setActualWorkspace(2)
          setReload(!reload)
          break
        case 'workspace_4':
          setActualWorkspace(3)
          setReload(!reload)
          break

        // ========== SCROLL WORKSPACES ==========
        case 'next_workspace': {
          const next = ((actualWorkspace + 1) % 4) as 0 | 1 | 2 | 3
          setActualWorkspace(next)
          setReload(!reload)
          break
        }
        case 'prev_workspace': {
          const prev = ((actualWorkspace - 1 + 4) % 4) as 0 | 1 | 2 | 3
          setActualWorkspace(prev)
          setReload(!reload)
          break
        }

        // ========== NAVEGAÇÃO ==========
        case 'go_back':
          goBackPath()
          break

        case 'go_forward':
          goNextPath()
          break

        case 'open_terminal':
          invoke('open_terminal', { path }).catch((err) =>
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
      // Ignorar botões primários (0=esquerdo, 2=direito) para não conflitar
      // com cliques normais, a não ser que estejam definidos nos SHORTCUTS
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

    console.log('✅ Atalhos ativados (teclado + scroll + mouse)')

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('wheel', handleWheel)
      window.removeEventListener('mousedown', handleMouseDown)
      console.log('❌ Atalhos desativados')
    }
  }, [
    selectedFiles,
    resetSelected,
    reload,
    setReload,
    setActualWorkspace,
    actualWorkspace,
    goBackPath,
    goNextPath,
    path,
  ])
}

export default useKeyboardShortcuts
