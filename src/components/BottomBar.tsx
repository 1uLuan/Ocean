import { GearIcon } from '@phosphor-icons/react';
import { useConfigStore } from '@/stores/ConfigStore';
import { WorkSpaces } from '@/components/WorkSpaces';

export function BottomBar() {
  const toggleShowConfig = useConfigStore((state) => state.toggleShowConfig);
  const configIsOpen = useConfigStore((state) => state.configIsOpen);
  return (
    <>
      <div className="w-full h-[1px] bg-[var(--border-primary)]" />
      <div className="flex flex-row pl-2 h-6 w-full bg-[var(--bg-primary)] items-center">
        <button
          className="flex items center justify-center w-4 hover:bg-[var(--bg-hover-primary)] rounded-full duration-200"
          onClick={() => toggleShowConfig(!configIsOpen)}
        >
          <GearIcon />
        </button>
        <div className="flex flex-row w-full h-full items-center justify-center">
          <WorkSpaces />
        </div>
      </div>
    </>
  );
}
