import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useCopyPopupStore } from '@/stores/CopyPopup';
import { TypeCopyProgress } from '@/stores/CopyPopup';
import { XIcon } from '@phosphor-icons/react';

export function CopyPopup() {
  const copyProgress = useCopyPopupStore((state) => state.copyProgress);
  const progress = useCopyPopupStore((state) => state.progress);
  const fileOnCopy = useCopyPopupStore((state) => state.fileOnCopy);
  const elapsed_secs = useCopyPopupStore((state) => state.elapsed_secs);
  const setProgress = useCopyPopupStore((state) => state.setProgress);
  const setFileOnCopy = useCopyPopupStore((state) => state.setFileOnCopy);
  const setElapsed_secs = useCopyPopupStore((state) => state.setElapsed_secs);
  const cancelCopy = useCopyPopupStore((state) => state.cancelCopy);

  useEffect(() => {
    const unlistenProgress = listen('copy_progress', (event) => {
      const data = event.payload as TypeCopyProgress;
      setProgress(data.file_percent);
      setElapsed_secs(data.elapsed_secs);
      setFileOnCopy(data.file);
    });
    return () => {
      unlistenProgress.then((f) => f());
    };
  }, []);

  return (
    <>
      {copyProgress && (
        <div className="h-40 w-75 absolute top-[25%] left-[40%] rounded-[8px] p-[4px] z-[1000] bg-[var(--bg-tertiary)] border border-[var(--border-secondary)]">
          <div className="flex items-start justify-between">
            <div className="text-[12px] w-auto bg-[var(--bg-secondary)] rounded-[4px] pr-2 pl-2 border border-[var(--border-secondary)]">
              {fileOnCopy}
            </div>
            <button
              className="flex items-center justify-center w-[26px] h-[26px] bg-[var(--bg-tertiary)] hover:bg-red-700 transition-color duration-200 rounded-md border border-[var(--border-secondary)] "
              onClick={() => cancelCopy()}
            >
              <XIcon weight="light" size={14} />
            </button>
          </div>
          <div className="flex flex-col justify-end-safe h-[73%]">
            <div className="flex flex-row gap-10">
              <div className="text-[11px]">{Math.floor(progress)}%</div>
              <div className="text-[11px]">
                Tempo: {Math.floor(elapsed_secs)}s
              </div>
            </div>
            <div className=" flex gap-1 trasparent h-[6px] w-full overflow-hidden">
              <div
                className="bg-blue-500 rounded-full h-[100%] transition-[width] ease-in-out "
                style={{ width: Math.floor(progress) + '%' }}
              />
              <div className="bg-red-500 rounded-full flex-1 h-[100%] transition-[width] ease-in-out " />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
