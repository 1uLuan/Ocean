import {
  ArrowLeftIcon,
  ArrowRightIcon,
  MagnifyingGlassIcon,
  CaretRightIcon,
} from '@phosphor-icons/react'
import { useNavigationStore } from '@/stores/NavigationStore.ts'

export function TopBar() {
  const path = useNavigationStore((state) => state.path)
  const goBackPath = useNavigationStore((state) => state.goBackPath)
  const goNextPath = useNavigationStore((state) => state.goNextPath)

  return (
    <>
      <div className="flex h-10 w-[100%] flex-row gap-0.5 p-[3px] pr-[3px] pl-[4px]">
        <button
          data-component="Button"
          type="button"
          className="flex w-10 flex-row items-center justify-center rounded-xl duration-200 hover:bg-[var(--bg-hover-primary)]"
          onClick={() => goBackPath()}
        >
          <ArrowLeftIcon />
        </button>
        <button
          data-component="Button"
          type="button"
          className="flex w-10 flex-row items-center justify-center rounded-xl duration-200 hover:bg-[var(--bg-hover-primary)]"
          onClick={() => goNextPath()}
        >
          <ArrowRightIcon />
        </button>
        <div className="flex w-full overflow-hidden">
          <div
            data-content="Path-Visor"
            className="scrollbar-none flex h-full w-full overflow-x-scroll overflow-y-hidden rounded-tl-xl rounded-bl-xl bg-[var(--bg-tertiary)] pl-3 text-[0.9rem] whitespace-nowrap"
          >
            {path === '/' ? (
              <span className="flex items-center">Root</span>
            ) : (
              path
                .split('/')
                .filter(Boolean)
                .map((segment, index, array) => (
                  <span key={index} className="flex items-center">
                    <span>{segment}</span>
                    {index < array.length - 1 && (
                      <span className="mx-2">
                        <CaretRightIcon size={14} />
                      </span>
                    )}
                  </span>
                ))
            )}
          </div>
          <button className="ml-auto flex w-10 flex-row items-center justify-center rounded-tr-xl rounded-br-xl bg-[var(--bg-tertiary)] duration-200 hover:bg-[var(--bg-hover-primary)]">
            <MagnifyingGlassIcon />
          </button>
        </div>
      </div>

      {/* <div className="w-[100%] h-[1px] bg-[var(--border-primary)]" /> */}
    </>
  )
}
