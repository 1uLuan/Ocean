import '@/App.css';
import '@/Themes.css';
import { useEffect } from 'react';
//components
import { NamePopup } from '@/components/NamePopup.tsx';
import { TopBar } from '@/components/TopBar.tsx';
import { SideBar } from '@/components/SideBar.tsx';
import { MainContent } from '@/components/MainContent.tsx';
import { ContextMenu } from '@/components/ContextMenu.tsx';
import { IconContext } from '@phosphor-icons/react';
import { CopyPopup } from '@/components/CopyPopup.tsx';
import { TitleBar } from '@/components/TitleBar';
import { ConfigScreen } from '@/components/ConfigScreen';
import { BottomBar } from '@/components/BottomBar';

//stores
import { useNavigationStore } from '@/stores/NavigationStore.ts';
import { useConfigStore } from '@/stores/ConfigStore';
//hooks
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

function FileExplorer() {
  const goNextPath = useNavigationStore((state) => state.goNextPath);
  const goBackPath = useNavigationStore((state) => state.goBackPath);
  const config = useConfigStore((state) => state.config);
  useEffect(() => {
    {
      document.documentElement.setAttribute('data-theme', config.theme);
    }
  }, [config.theme]);

  useKeyboardShortcuts();

  return (
    <main
      className="flex flex-col h-screen text-[var(--text-primary)]"
      style={{ background: 'var(--bg-primary)' }}
      onMouseDown={(e) => {
        if (e.button === 3) {
          goBackPath();
        } else if (e.button === 4) {
          goNextPath();
        }
      }}
    >
      <IconContext.Provider
        value={{ size: 16, color: 'var(--text-primary)', weight: `regular` }}
      >
        <div data-info="vertical flex" className="flex flex-col flex-none">
          <TitleBar />
          <TopBar />
        </div>
        <div
          data-info="horizontal flex"
          className="flex flex-row flex-1 overflow-hidden"
        >
          <div className="flex flex-col">
            <SideBar />
          </div>
          <div className="ml-0.5 w-[1px] h-full bg-[var(--border-primary)]" />
          <MainContent />
          <ConfigScreen />
        </div>
        <BottomBar />
        <ContextMenu />
        <NamePopup />
        <CopyPopup />
      </IconContext.Provider>
    </main>
  );
}

export default FileExplorer;
