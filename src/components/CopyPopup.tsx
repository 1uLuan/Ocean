import { useEffect, useRef, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useCopyPopupStore } from '@/stores/CopyPopup';
import { TypeCopyProgress } from '@/stores/CopyPopup';
import { XIcon } from '@phosphor-icons/react';

export function CopyPopup({  initialX = window.innerWidth / 2 - 200,
  initialY = window.innerHeight / 2 - 150}) {
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

  const [position, setPosition] = useState({ x: initialX, y: initialY });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const popupRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      // Limites da tela
      const maxX = window.innerWidth - (popupRef.current?.offsetWidth || 0);
      const maxY = window.innerHeight - (popupRef.current?.offsetHeight || 0);

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!popupRef.current) return;

    const rect = popupRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setIsDragging(true);
  };

  return (
    <>
      {copyProgress && (
        <div 
          ref={popupRef}
          className="h-40 w-75 absolute rounded-[8px] p-[4px] z-[1000] bg-[var(--bg-tertiary)] border border-[var(--border-secondary)]"
          onMouseDown={handleMouseDown}
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            cursor: isDragging ? 'grabbing' : 'default'
        }}
        >
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
