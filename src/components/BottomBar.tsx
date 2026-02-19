import { GearIcon } from '@phosphor-icons/react'
import { useConfigStore } from '@/stores/ConfigStore'
import { WorkSpaces } from '@/components/WorkSpaces'

export function BottomBar() {
  const toggleShowConfig = useConfigStore((state) => state.toggleShowConfig)
  const configIsOpen = useConfigStore((state) => state.configIsOpen)
  return (
    <>
      <div className="h-[1px] w-full" />
      <div className="flex h-6 w-full flex-row items-center pl-2">
        <button
          className="items center flex w-4 justify-center rounded-full duration-200 hover:bg-[var(--bg-hover-primary)]"
          onClick={() => toggleShowConfig(!configIsOpen)}
        >
          <GearIcon />
        </button>
        <div className="flex h-full w-full flex-row items-center justify-center">
          <WorkSpaces />
        </div>
      </div>
    </>
  )
}
