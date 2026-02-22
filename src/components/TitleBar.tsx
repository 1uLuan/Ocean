import { getCurrentWindow } from '@tauri-apps/api/window'
import { CornersOut, Minus, X } from 'phosphor-solid'
import { useConfigStore } from '@/stores/ConfigStore'
export function TitleBar() {
  const appWindow = getCurrentWindow()
  const conf = useConfigStore()
  return (
    <>
      {conf.config.title_bar && (
        <div
          data-tauri-drag-region
          class="z-50 flex h-6 w-screen flex-row items-center gap-1 bg-[var(--bg-secondary)] p-1"
        >
          <div class="text-blue-400">Ocean</div>
          <button
            class="ml-auto flex h-5 w-5 items-center justify-center rounded-md hover:bg-[var(--bg-hover-primary)]"
            onClick={() => appWindow.minimize()}
          >
            <Minus />
          </button>
          <button
            class="flex h-5 w-5 items-center justify-center rounded-md hover:bg-[var(--bg-hover-primary)]"
            onClick={() => appWindow.maximize()}
          >
            <CornersOut />
          </button>
          <button
            class="flex h-5 w-5 items-center justify-center rounded-md hover:bg-[var(--bg-hover-primary)]"
            onClick={() => appWindow.close()}
          >
            <X />
          </button>
        </div>
      )}
    </>
  )
}
