import { useFileStore } from '@/stores/FileStore';
import { useEffect } from 'react';
import { usePopupControl } from '@/stores/PopupControl';
import { useContextMenuStore } from '@/stores/ContextMenuStore';
export function WarningPopup() {
  const getPathName = useFileStore((state) => state.getPathName);
  const pathName = useFileStore((state) => state.pathName);
  const WarningPopup = usePopupControl((state) => state.warningPopup);
  const setWarningPopup = usePopupControl((state) => state.setWarningPopup);
  const del = useContextMenuStore((state) => state.delete);

  useEffect(() => {
    getPathName();
  }, [WarningPopup]);

  return (
    <>
      {WarningPopup && (
        <div className="absolute w-full h-full z-40 grid place-items-center">
          <div className="flex flex-col w-80 h-96 z-50 p-1 gap-1 text-[0.9rem] bg-[var(--bg-tertiary)] rounded-xl">
            <div className="flex-1">Do You Really Want Delete This Item?</div>
            <ul className="flex-3 p-1 bg-[var(--bg-secondary)] border border-zinc-900 rounded-xl">
              {pathName.map((name) => (
                <li>{name}</li>
              ))}
            </ul>
            <div className="flex flex-row justify-between p-1">
              <button
                className="w-30 h-10 rounded-xl bg-[var(--button-bg)] hover:bg-red-600"
                onClick={() => {
                  del();
                  setWarningPopup(false);
                }}
              >
                Delete
              </button>
              <button
                className="w-30 h-10 rounded-xl bg-[var(--button-bg)] hover:bg-[var(--button-hover)]"
                onClick={() => setWarningPopup(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
