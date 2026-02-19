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
  | 'next_workspace'
  | 'prev_workspace'
  | 'go_back'
  | 'go_forward'
  | 'open_terminal'

export interface Shortcut {
  key?: string
  scroll?: 'up' | 'down'
  mouseButton?: number // 0=left, 1=middle, 2=right, 3=back, 4=forward
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  description: string
  action: ShortcutAction
  type?: 'keyboard' | 'scroll' | 'mouse'
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

  // ========== ATALHOS COM BOTÕES DO MOUSE ==========
  go_back: {
    mouseButton: 3, // Botão "Voltar" lateral do mouse
    description: 'Voltar (Botão lateral esquerdo do mouse)',
    action: 'go_back',
    type: 'mouse',
  },
  go_forward: {
    mouseButton: 4, // Botão "Avançar" lateral do mouse
    description: 'Avançar (Botão lateral direito do mouse)',
    action: 'go_forward',
    type: 'mouse',
  },

  open_terminal: {
    key: 't',
    ctrl: true,
    shift: true,
    description: 'Abrir terminal',
    action: 'open_terminal',
    type: 'keyboard',
  },
}

/**
 * Verifica se uma tecla pressionada corresponde a um atalho de teclado
 */
export function matchesKeyboardShortcut(event: KeyboardEvent, shortcut: Shortcut): boolean {
  if (shortcut.type === 'scroll' || shortcut.type === 'mouse' || !shortcut.key) return false

  const ctrlPressed = event.ctrlKey || event.metaKey

  return (
    event.key.toLowerCase() === shortcut.key.toLowerCase() &&
    (shortcut.ctrl ? ctrlPressed : !ctrlPressed) &&
    (shortcut.shift ? event.shiftKey : !event.shiftKey) &&
    (shortcut.alt ? event.altKey : !event.altKey)
  )
}

/**
 * Verifica se um scroll corresponde a um atalho de scroll
 */
export function matchesScrollShortcut(event: WheelEvent, shortcut: Shortcut): boolean {
  if (shortcut.type !== 'scroll' || !shortcut.scroll) return false

  const ctrlPressed = event.ctrlKey || event.metaKey
  const scrollDirection = event.deltaY > 0 ? 'down' : 'up'

  return (
    scrollDirection === shortcut.scroll &&
    (shortcut.ctrl ? ctrlPressed : !ctrlPressed) &&
    (shortcut.shift ? event.shiftKey : !event.shiftKey) &&
    (shortcut.alt ? event.altKey : !event.altKey)
  )
}

/**
 * Verifica se um botão do mouse corresponde a um atalho de mouse
 */
export function matchesMouseShortcut(event: MouseEvent, shortcut: Shortcut): boolean {
  if (shortcut.type !== 'mouse' || shortcut.mouseButton === undefined) return false

  const ctrlPressed = event.ctrlKey || event.metaKey

  return (
    event.button === shortcut.mouseButton &&
    (shortcut.ctrl ? ctrlPressed : !ctrlPressed) &&
    (shortcut.shift ? event.shiftKey : !event.shiftKey) &&
    (shortcut.alt ? event.altKey : !event.altKey)
  )
}

/**
 * Formata atalho para exibição
 */
export function formatShortcut(shortcut: Shortcut): string {
  const parts: string[] = []
  const isMac = navigator.platform.toLowerCase().includes('mac')

  if (shortcut.ctrl) parts.push(isMac ? '⌘' : 'Ctrl')
  if (shortcut.shift) parts.push(isMac ? '⇧' : 'Shift')
  if (shortcut.alt) parts.push(isMac ? '⌥' : 'Alt')

  if (shortcut.type === 'scroll') {
    parts.push(shortcut.scroll === 'up' ? '🖱️↑' : '🖱️↓')
  } else if (shortcut.type === 'mouse') {
    const mouseLabels: Record<number, string> = {
      0: '🖱️ Esquerdo',
      1: '🖱️ Meio',
      2: '🖱️ Direito',
      3: '🖱️ Voltar',
      4: '🖱️ Avançar',
    }
    parts.push(mouseLabels[shortcut.mouseButton!] ?? `🖱️ Btn${shortcut.mouseButton}`)
  } else if (shortcut.key) {
    parts.push(formatKey(shortcut.key))
  }

  return parts.join(' + ')
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
  }

  return specialKeys[key] || key.toUpperCase()
}
