import { useContextMenuStore } from '@/stores/ContextMenuStore.ts';

export function NamePopup() {
  const onEnter = useContextMenuStore((state) => state.onEnter);
  const text = useContextMenuStore((state) => state.text);
  const closePopup = useContextMenuStore((state) => state.closePopup);
  const isOpen = useContextMenuStore((state) => state.isOpen);
  const setText = useContextMenuStore((state) => state.setText);

  return (
    isOpen && (
      <div className="absolute flex flex-col items-center top-[30%] left-[40%] w-[200px] h-[70px] rounded-[12px] bg-[var(--bg-tertiary)] pl-4 pr-4">
        <div className="text-left w-[100%] text-[12px]">Digite O Nome:</div>
        <textarea
          className="bg-[var(--bg-secondary)] w-[190px] h-[40px] rounded-[12px] resize-none text-[14px] text-center border border-[var(--border-primary)] outline-none"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(k) => {
            if (k.key === 'Enter') {
              onEnter?.();
            }
            if (k.key === 'Escape') {
              closePopup();
            }
          }}
          autoFocus
        ></textarea>
      </div>
    )
  );
}
