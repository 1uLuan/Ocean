import { getCurrentWindow } from '@tauri-apps/api/window';
import { CornersOutIcon, MinusIcon, XIcon } from '@phosphor-icons/react';
import { useConfigStore } from '@/stores/ConfigStore';
export function TitleBar() {
  const appWindow = getCurrentWindow();
  const config = useConfigStore((state) => state.config);
  return (
    <>
      {config.title_bar && (
        <div
          data-tauri-drag-region
          className="flex flex-row z-50 p-1 gap-1 items-center w-screen h-6 bg-[var(--bg-primary)]"
        >
          <div className="text-blue-400">Ocean</div>
          <button
            className="flex w-5 h-5 hover:bg-[var(--bg-hover-primary)] rounded-md ml-auto items-center justify-center"
            onClick={() => appWindow.minimize()}
          >
            <MinusIcon />
          </button>
          <button
            className="flex w-5 h-5 hover:bg-[var(--bg-hover-primary)] rounded-md items-center justify-center"
            onClick={() => appWindow.maximize()}
          >
            <CornersOutIcon />
          </button>
          <button
            className="flex w-5 h-5 hover:bg-[var(--bg-hover-primary)] rounded-md items-center justify-center "
            onClick={() => appWindow.close()}
          >
            <XIcon />
          </button>
        </div>
      )}
    </>
  );
}
