import { useContextMenuStore } from '@/stores/ContextMenuStore.ts'
import { Show } from 'solid-js'

export function NamePopup() {
  const cont = useContextMenuStore()

  return (
    <Show when={cont.isOpen}>
      <div class="absolute grid h-full w-full place-items-center">
        <div class="flex h-30 w-62 flex-col items-center rounded-lg border border-(--border-primary) bg-(--bg-modal) p-3 hover:border-(--bg-focus-ring)">
          <div class="w-full text-[0.8rem]">Digite O Nome:</div>
          <textarea
            class="mt-auto h-7 w-full resize-none overflow-y-hidden rounded-lg bg-(--bg-input) text-center text-[0.9rem] whitespace-nowrap outline-none focus:border focus:border-(--border-secondary)"
            ref={(el) => setTimeout(() => el.focus(), 0)}
            value={cont.text}
            onInput={(e) => cont.setText(e.target.value)}
            onKeyDown={(k) => {
              if (k.key === 'Enter') {
                cont.onEnter?.()
                cont.closePopup()
              }
            }}
          ></textarea>
        </div>
      </div>
    </Show>
  )
}
