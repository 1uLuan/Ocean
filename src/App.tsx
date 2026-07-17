import '@/App.css'
import '@/Themes.css'
import { createEffect, onMount, Show } from 'solid-js'
//components
import { NamePopup } from '@/components/NamePopup.tsx'
import { TopBar } from '@/components/TopBar.tsx'
import { SideBar } from '@/components/SideBar.tsx'
import { MainContent } from '@/components/MainContent.tsx'
import { ContextMenu } from '@/components/ContextMenu.tsx'
import { IconContext } from 'phosphor-solid'
import { TitleBar } from '@/components/TitleBar'
import { ConfigScreen } from '@/components/ConfigScreen'
import { BottomBar } from '@/components/BottomBar'
import { WarningPopup } from '@/components/WarningPopup'
import { WorkspaceBar } from '@/components/WorkspaceBar'
//stores
import { useConfigStore } from '@/stores/ConfigStore'
import { useContextMenuStore } from './stores/ContextMenuStore'
import { usePopupControl } from './stores/PopupControl'
import { useNavigationStore } from './stores/NavigationStore'
//hooks
import useKeyboardShortcuts from '@/hooks/useKeyboardShortcuts'
import { invoke } from '@tauri-apps/api/core'

function FileExplorer() {
  const conf = useConfigStore()
  const cont = useContextMenuStore()
  const pop = usePopupControl()
  const nav = useNavigationStore()
  createEffect(() => {
    {
      document.documentElement.setAttribute('data-theme', conf.config.theme)
    }
  }, [conf.config.theme])

  useKeyboardShortcuts()

  onMount(() => {
    function disableContextMenu(e: MouseEvent) {
      return e.preventDefault()
    }
    window.addEventListener('contextmenu', disableContextMenu)
    return () => window.removeEventListener('contextmenu', disableContextMenu)
  })
  onMount(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        cont.setShowMenu(false)
        pop.setWarningPopup(false)
        cont.closePopup()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  })

  onMount(() => {
    invoke<string>('get_home').then((homePath) => {
      nav.setHome(homePath)
      nav.goPath(homePath)
    })
  })

  return (
    <main class="flex h-screen flex-col bg-[var(--bg-secondary)] text-[var(--text-primary)]">
      <IconContext.Provider value={{ size: 16, color: 'var(--text-primary)', weight: `bold` }}>
        <div class="flex flex-none flex-col">
          <TitleBar />
          <TopBar />
          <div class="h-px w-full shrink-0 bg-[var(--border-primary)]" /> {/*Divisor */}
        </div>
        <div class="flex h-full w-full flex-row overflow-hidden">
          <SideBar />
          <div class="h-full w-px shrink-0 bg-[var(--border-primary)]" /> {/*Divisor */}
          <ConfigScreen />
          <div class="flex h-full w-full flex-col overflow-hidden">
            <Show when={conf.workspaceActive}>
              <WorkspaceBar />
            </Show>
            <MainContent />
          </div>
        </div>
        <div class="h-px w-full shrink-0 bg-[var(--border-primary)]" /> {/*Divisor */}
        <BottomBar />
        <ContextMenu />
        <NamePopup />
        <WarningPopup />
      </IconContext.Provider>
    </main>
  )
}

export default FileExplorer
