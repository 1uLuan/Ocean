import '@/App.css'
import '@/Themes.css'
import { createEffect } from 'solid-js'

//components
import { NamePopup } from '@/components/NamePopup.tsx'
import { TopBar } from '@/components/TopBar.tsx'
import { SideBar } from '@/components/SideBar.tsx'
import { MainContent } from '@/components/MainContent.tsx'
import { ContextMenu } from '@/components/ContextMenu.tsx'
import { IconContext } from 'phosphor-solid'
import { CopyPopup } from '@/components/CopyPopup.tsx'
import { TitleBar } from '@/components/TitleBar'
import { ConfigScreen } from '@/components/ConfigScreen'
import { BottomBar } from '@/components/BottomBar'
import { WarningPopup } from '@/components/WarningPopup'
import { RightBar } from '@/components/RightBar'

//stores
import { useConfigStore } from '@/stores/ConfigStore'
//hooks
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

function FileExplorer() {
  const conf = useConfigStore()
  createEffect(() => {
    {
      document.documentElement.setAttribute('data-theme', conf.config.theme)
    }
  }, [conf.config.theme])

  useKeyboardShortcuts()

  return (
    <main class="flex h-screen flex-col bg-[var(--bg-secondary)] text-[var(--text-primary)]">
      <IconContext.Provider value={{ size: 16, color: 'var(--text-primary)', weight: `bold` }}>
        <div data-info="vertical flex" class="flex flex-none flex-col">
          <TitleBar />
          <TopBar />
        </div>
        <div data-info="horizontal flex" class="flex flex-1 flex-row overflow-hidden">
          <SideBar />
          <MainContent />
          <ConfigScreen />
          <RightBar />
        </div>
        <BottomBar />
        <ContextMenu />
        <NamePopup />
        <WarningPopup />
      </IconContext.Provider>
    </main>
  )
}

export default FileExplorer
