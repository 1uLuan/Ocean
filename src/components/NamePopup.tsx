import { useContextMenuStore } from '@/stores/ContextMenuStore.ts'
import { Show } from 'solid-js'

export function NamePopup() {
  const cont = useContextMenuStore()

  return (
    <Show when={cont.isOpen}>
      <div class="absolute top-[30%] left-[40%] flex h-[70px] w-[200px] flex-col items-center rounded-[12px] bg-[var(--bg-tertiary)] pr-4 pl-4">
        <div class="w-[100%] text-left text-[12px]">Digite O Nome:</div>
        <textarea
          class="h-[40px] w-[190px] resize-none rounded-[12px] border border-[var(--border-primary)] bg-[var(--bg-secondary)] text-center text-[14px] outline-none"
          ref={(el) => setTimeout(() => el.focus(), 0)}
          value={cont.text}
          onInput={(e) => cont.setText(e.target.value)}
          onKeyDown={(k) => {
            if (k.key === 'Enter') {
              cont.onEnter?.()
            }
            if (k.key === 'Escape') {
              cont.closePopup()
            }
          }}
        ></textarea>
      </div>
    </Show>
  )
}
