import { For, createSignal } from 'solid-js'
import { CompressPopup } from './CompressPopup'
import { CopyPopup } from './CopyPopup'
import { usePopupControl } from '@/stores/PopupControl'

const pop = usePopupControl()

export function BottomBar() {
  const [active, setActive] = createSignal(false)
  return (
    <div class="flex h-8 w-full flex-row items-center justify-center">
      <div class="h-full w-full" />
      <div class="relative h-full w-full" onclick={() => setActive(!active())}>
        <div
          class={`absolute -bottom-97.5 flex h-96 w-full flex-col overflow-scroll rounded-tl-md rounded-tr-md bg-(--bg-secondary) p-px transition-transform duration-150 ease-in-out ${active() ? '-translate-y-105.5 border-t border-r border-l border-(--border-primary)' : 'translate-y-0'}`}
        >
          <For each={pop.compressions}>
            {(id) => <CompressPopup opId={id} onCancel={pop.cancelCompress} />}
          </For>
          <For each={pop.copies}>{(id) => <CopyPopup copyId={id} onCancel={pop.cancelCopy} />}</For>
        </div>
      </div>
      <div class="h-full w-full" />
    </div>
  )
}
