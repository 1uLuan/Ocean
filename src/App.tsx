import '@/App.css'
import '@/Themes.css'
import { useEffect } from 'react'
//components
import { NamePopup } from '@/components/NamePopup.tsx'
import { TopBar } from '@/components/TopBar.tsx'
import { SideBar } from '@/components/SideBar.tsx'
import { MainContent } from '@/components/MainContent.tsx'
import { ContextMenu } from '@/components/ContextMenu.tsx'
import { IconContext } from '@phosphor-icons/react'
import { CopyPopup } from '@/components/CopyPopup.tsx'
import { TitleBar } from '@/components/TitleBar'
import { ConfigScreen } from '@/components/ConfigScreen'
import { BottomBar } from '@/components/BottomBar'
import { WarningPopup } from '@/components/WarningPopup'

//stores
import { useNavigationStore } from '@/stores/NavigationStore.ts'
import { useConfigStore } from '@/stores/ConfigStore'
//hooks
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

function FileExplorer() {
  const goNextPath = useNavigationStore((state) => state.goNextPath)
  const goBackPath = useNavigationStore((state) => state.goBackPath)
  const config = useConfigStore((state) => state.config)
  useEffect(() => {
    {
      document.documentElement.setAttribute('data-theme', config.theme)
    }
  }, [config.theme])

  useKeyboardShortcuts()

  return (
    <main className="flex h-screen flex-col bg-[var(--bg-secondary)] text-[var(--text-primary)]">
      <IconContext.Provider value={{ size: 16, color: 'var(--text-primary)', weight: `regular` }}>
        <div data-info="vertical flex" className="flex flex-none flex-col">
          <TitleBar />
          <TopBar />
        </div>
        <div data-info="horizontal flex" className="flex flex-1 flex-row overflow-hidden">
          <div className="flex flex-col">
            <SideBar />
          </div>
          {/* <div className="ml-0.5 h-full w-[1px] bg-[var(--border-primary)]" /> */}
          <MainContent />
          <ConfigScreen />
          <SideBar />
        </div>
        <BottomBar />
        <ContextMenu />
        <NamePopup />
        <CopyPopup initialX={300} initialY={200} />
        <WarningPopup />
      </IconContext.Provider>
    </main>
  )
}

export default FileExplorer
