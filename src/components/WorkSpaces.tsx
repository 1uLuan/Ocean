import {
  NumberCircleOneIcon,
  NumberCircleTwoIcon,
  NumberCircleThreeIcon,
  NumberCircleFourIcon,
  type IconProps,
} from '@phosphor-icons/react';
import { useNavigationStore } from '@/stores/NavigationStore.ts';
import { useFileStore } from '@/stores/FileStore';
export function WorkSpaces() {
  const setActualWorkspace = useNavigationStore(
    (state) => state.setActualWorkspace,
  );
  const actualWorkspace = useNavigationStore((state) => state.actualWorkspace);
  const setReload = useFileStore((state) => state.setReload);
  const reload = useFileStore((state) => state.reload);
  const spaces: Record<number, React.ComponentType<IconProps>> = {
    1: NumberCircleOneIcon,
    2: NumberCircleTwoIcon,
    3: NumberCircleThreeIcon,
    4: NumberCircleFourIcon,
  };

  return (
    <>
      <div className="flex flex-row justify-center bg-[var(--bg-tertiary)] w-17 h-5 rounded-2xl">
        {Object.entries(spaces).map(([number, Icon], idx) => (
          <div key={number}>
            <button
              onClick={() => {
                setActualWorkspace(idx as 0 | 1 | 2 | 3);
                setReload(!reload);
              }}
            >
              <Icon
                weight={actualWorkspace === idx ? 'fill' : 'regular'}
                size={16}
              />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
