import {
  ArrowLeftIcon,
  ArrowRightIcon,
  MagnifyingGlassIcon,
  CaretRightIcon,
} from '@phosphor-icons/react';
import { useNavigationStore } from '@/stores/NavigationStore.ts';

export function TopBar() {
  const path = useNavigationStore((state) => state.path);
  const goBackPath = useNavigationStore((state) => state.goBackPath);
  const goNextPath = useNavigationStore((state) => state.goNextPath);

  return (
    <>
      <div className="flex flex-row gap-0.5 p-[3px] h-10 w-[100%] pl-[4px] pr-[3px]">
        <button
          data-component="Button"
          type="button"
          className="flex flex-row w-10 hover:bg-[var(--bg-hover-primary)] rounded-xl duration-200 items-center justify-center"
          onClick={() => goBackPath()}
        >
          <ArrowLeftIcon />
        </button>
        <button
          data-component="Button"
          type="button"
          className="flex flex-row w-10 hover:bg-[var(--bg-hover-primary)] rounded-xl duration-200 items-center justify-center"
          onClick={() => goNextPath()}
        >
          <ArrowRightIcon />
        </button>
        <div className="flex w-full overflow-hidden">
          <div
            data-content="Path-Visor"
            className="flex rounded-tl-xl rounded-bl-xl bg-[var(--bg-tertiary)] pl-3 h-full w-full whitespace-nowrap overflow-y-hidden overflow-x-scroll scrollbar-none text-[0.9rem]"
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
                      <span className="mx-2 ">
                        <CaretRightIcon size={14} />
                      </span>
                    )}
                  </span>
                ))
            )}
          </div>
          <button className="flex flex-row w-10 ml-auto bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover-primary)] rounded-br-xl rounded-tr-xl duration-200 items-center justify-center">
            <MagnifyingGlassIcon />
          </button>
        </div>
      </div>

      <div className="w-[100%] h-[1px] bg-[var(--border-primary)]" />
    </>
  );
}
