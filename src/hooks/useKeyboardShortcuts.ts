// src/hooks/useKeyboardShortcuts.ts
import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  SHORTCUTS,
  matchesKeyboardShortcut,
  matchesScrollShortcut,
  ShortcutAction,
} from '@/utils/shortcuts';
import { useNavigationStore } from '@/stores/NavigationStore';
import { useFileStore } from '@/stores/FileStore';
import { useContextMenuStore } from '@/stores/ContextMenuStore';

export function useKeyboardShortcuts() {
  const path = useNavigationStore((state) => state.path);
  const actualWorkspace = useNavigationStore((state) => state.actualWorkspace);
  const goBackPath = useNavigationStore((state) => state.goBackPath);
  const setActualWorkspace = useNavigationStore(
    (state) => state.setActualWorkspace,
  );

  const selectedFiles = useFileStore((state) => state.selectedFiles);
  const setCopySelected = useFileStore((state) => state.setCopySelected);
  const pasteDir = useContextMenuStore((state) => state.pasteDir);
  const resetSelected = useFileStore((state) => state.resetSelected);
  const reload = useFileStore((state) => state.reload);
  const setReload = useFileStore((state) => state.setReload);

  useEffect(() => {
    // ========== HANDLER DE TECLADO ==========
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar se estiver digitando em input
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Verificar cada atalho de teclado
      for (const [action, shortcut] of Object.entries(SHORTCUTS)) {
        if (
          shortcut.type === 'keyboard' &&
          matchesKeyboardShortcut(e, shortcut)
        ) {
          e.preventDefault();
          handleShortcutAction(action as ShortcutAction);
          return;
        }
      }
    };

    // ========== HANDLER DE SCROLL ==========
    const handleWheel = (e: WheelEvent) => {
      // Verificar cada atalho de scroll
      for (const [action, shortcut] of Object.entries(SHORTCUTS)) {
        if (shortcut.type === 'scroll' && matchesScrollShortcut(e, shortcut)) {
          e.preventDefault();
          handleShortcutAction(action as ShortcutAction);
          return;
        }
      }
    };

    // ========== EXECUTAR AÇÃO DO ATALHO ==========
    const handleShortcutAction = (action: ShortcutAction) => {
      console.log('Atalho acionado:', action);

      switch (action) {
        case 'copy':
          if (selectedFiles.length > 0) {
            setCopySelected(selectedFiles);
          }
          break;

        case 'paste':
          console.log('Colar');
          pasteDir();
          break;

        case 'delete':
          if (selectedFiles.length > 0) {
            invoke('move_to_trash', { dirPath: selectedFiles })
              .then(() => {
                resetSelected();
                setReload(!reload);
              })
              .catch((err) => console.error('Erro ao deletar:', err));
          }
          break;

        case 'refresh':
          setReload(!reload);
          break;

        // ========== WORKSPACES ==========
        case 'workspace_1':
          setActualWorkspace(0);
          setReload(!reload);
          break;

        case 'workspace_2':
          setActualWorkspace(1);
          setReload(!reload);
          break;

        case 'workspace_3':
          setActualWorkspace(2);
          setReload(!reload);
          break;

        case 'workspace_4':
          setActualWorkspace(3);
          setReload(!reload);
          break;

        // ========== SCROLL WORKSPACES ==========
        case 'next_workspace':
          {
            const next = ((actualWorkspace + 1) % 4) as 0 | 1 | 2 | 3;
            setActualWorkspace(next);
            setReload(!reload);
          }
          break;

        case 'prev_workspace':
          {
            const prev = ((actualWorkspace - 1 + 4) % 4) as 0 | 1 | 2 | 3;
            setActualWorkspace(prev);
            setReload(!reload);
          }
          break;

        case 'go_back':
          goBackPath();
          break;

        case 'open_terminal':
          invoke('open_terminal', { path }).catch((err) =>
            console.error('Erro ao abrir terminal:', err),
          );
          break;

        default:
          console.warn('Ação não implementada:', action);
      }
    };

    // Adicionar listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleWheel, { passive: false });

    console.log('✅ Atalhos ativados (teclado + scroll)');

    // Cleanup: remover listeners
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel);
      console.log('❌ Atalhos desativados');
    };
  }, [
    selectedFiles,
    resetSelected,
    reload,
    setReload,
    setActualWorkspace,
    actualWorkspace,
    goBackPath,
    path,
  ]);
}

export default useKeyboardShortcuts;
