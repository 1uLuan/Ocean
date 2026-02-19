import { ReactElement } from 'react'
import { useNavigationStore } from '@/stores/NavigationStore'
import { useFileStore } from '@/stores/FileStore'
import {
  ArrowFatDownIcon,
  ComputerTowerIcon,
  HouseLineIcon,
  TrashSimpleIcon,
} from '@phosphor-icons/react'

export function SideBar() {
  const home = useNavigationStore((state) => state.home)
  const goPath = useNavigationStore((state) => state.goPath)
  const resetSelected = useFileStore((state) => state.resetSelected)
  const local_icons: Record<string, [ReactElement, string]> = {
    Home: [<HouseLineIcon />, home + ''],
    Download: [<ArrowFatDownIcon />, home + '/Downloads'],
    Trash: [<TrashSimpleIcon />, home + '/.local/share/Trash/files'],
    Root: [<ComputerTowerIcon />, '/'],
  }

  return (
    <div className="flex h-full">
      <div className="flex flex-none shrink-0 flex-col overflow-hidden pt-[1px] pl-[2px]">
        {Object.entries(local_icons).map(([name, [icon, path]], idx) => (
          <li key={idx} className="flex items-center">
            <button
              type="button"
              className="h-[30px] w-full rounded-md hover:bg-[var(--bg-hover-primary)]"
              onClick={() => {
                goPath(path)
                resetSelected()
              }}
            >
              <div className="flex h-full items-center gap-1.5 pl-1.5 text-[14px]">
                {icon}
                {name}
              </div>
            </button>
          </li>
        ))}
      </div>
    </div>
  )
}
