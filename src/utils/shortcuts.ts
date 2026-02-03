// src/utils/shortcuts.ts

export type ShortcutAction =
  | 'copy'
  | 'paste'
  | 'delete'
  | 'refresh'
  | 'workspace_1'
  | 'workspace_2'
  | 'workspace_3'
  | 'workspace_4'
  | 'next_workspace' // ← Novo
  | 'prev_workspace' // ← Novo
  | 'go_back'
  | 'open_terminal';

export interface Shortcut {
  key?: string; // ← Agora opcional (para scroll)
  scroll?: 'up' | 'down'; // ← Novo: direção do scroll
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  action: ShortcutAction;
  type?: 'keyboard' | 'scroll'; // ← Tipo de atalho
}

export const SHORTCUTS: Record<ShortcutAction, Shortcut> = {
  copy: {
    key: 'c',
    ctrl: true,
    description: 'Copiar arquivos',
    action: 'copy',
    type: 'keyboard',
  },
  paste: {
    key: 'v',
    ctrl: true,
    description: 'Colar arquivos/pastas',
    action: 'paste',
    type: 'keyboard',
  },
  delete: {
    key: 'Delete',
    description: 'Deletar arquivos',
    action: 'delete',
    type: 'keyboard',
  },
  refresh: {
    key: 'F5',
    description: 'Atualizar',
    action: 'refresh',
    type: 'keyboard',
  },
  workspace_1: {
    key: '1',
    alt: true,
    description: 'Workspace 1',
    action: 'workspace_1',
    type: 'keyboard',
  },
  workspace_2: {
    key: '2',
    alt: true,
    description: 'Workspace 2',
    action: 'workspace_2',
    type: 'keyboard',
  },
  workspace_3: {
    key: '3',
    alt: true,
    description: 'Workspace 3',
    action: 'workspace_3',
    type: 'keyboard',
  },
  workspace_4: {
    key: '4',
    alt: true,
    description: 'Workspace 4',
    action: 'workspace_4',
    type: 'keyboard',
  },

  // ========== ATALHOS COM SCROLL ==========
  next_workspace: {
    scroll: 'down',
    alt: true,
    description: 'Próximo workspace (Alt + Scroll Down)',
    action: 'next_workspace',
    type: 'scroll',
  },
  prev_workspace: {
    scroll: 'up',
    alt: true,
    description: 'Workspace anterior (Alt + Scroll Up)',
    action: 'prev_workspace',
    type: 'scroll',
  },

  go_back: {
    key: 'Backspace',
    description: 'Voltar',
    action: 'go_back',
    type: 'keyboard',
  },
  open_terminal: {
    key: 't',
    ctrl: true,
    shift: true,
    description: 'Abrir terminal',
    action: 'open_terminal',
    type: 'keyboard',
  },
};

/**
 * Verifica se uma tecla pressionada corresponde a um atalho de teclado
 */
export function matchesKeyboardShortcut(
  event: KeyboardEvent,
  shortcut: Shortcut,
): boolean {
  if (shortcut.type === 'scroll' || !shortcut.key) return false;

  const ctrlPressed = event.ctrlKey || event.metaKey;

  return (
    event.key.toLowerCase() === shortcut.key.toLowerCase() &&
    (shortcut.ctrl ? ctrlPressed : !ctrlPressed) &&
    (shortcut.shift ? event.shiftKey : !event.shiftKey) &&
    (shortcut.alt ? event.altKey : !event.altKey)
  );
}

/**
 * Verifica se um scroll corresponde a um atalho de scroll
 */
export function matchesScrollShortcut(
  event: WheelEvent,
  shortcut: Shortcut,
): boolean {
  if (shortcut.type !== 'scroll' || !shortcut.scroll) return false;

  const ctrlPressed = event.ctrlKey || event.metaKey;
  const scrollDirection = event.deltaY > 0 ? 'down' : 'up';

  return (
    scrollDirection === shortcut.scroll &&
    (shortcut.ctrl ? ctrlPressed : !ctrlPressed) &&
    (shortcut.shift ? event.shiftKey : !event.shiftKey) &&
    (shortcut.alt ? event.altKey : !event.altKey)
  );
}

/**
 * Formata atalho para exibição
 */
export function formatShortcut(shortcut: Shortcut): string {
  const parts: string[] = [];
  const isMac = navigator.platform.toLowerCase().includes('mac');

  if (shortcut.ctrl) parts.push(isMac ? '⌘' : 'Ctrl');
  if (shortcut.shift) parts.push(isMac ? '⇧' : 'Shift');
  if (shortcut.alt) parts.push(isMac ? '⌥' : 'Alt');

  if (shortcut.type === 'scroll') {
    const scrollIcon = shortcut.scroll === 'up' ? '🖱️↑' : '🖱️↓';
    parts.push(scrollIcon);
  } else if (shortcut.key) {
    parts.push(formatKey(shortcut.key));
  }

  return parts.join(' + ');
}

function formatKey(key: string): string {
  const specialKeys: Record<string, string> = {
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
    Backspace: '⌫',
    Delete: 'Del',
    Escape: 'Esc',
  };

  return specialKeys[key] || key.toUpperCase();
}
