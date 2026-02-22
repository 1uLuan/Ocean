import { WorkSpaces } from '@/components/WorkSpaces'
import { CopyPopup } from '@/components/CopyPopup'
import { usePopupControl } from '@/stores/PopupControl'
import { useSmoothScroll } from '@/hooks/useSmoothScroll'
import { For } from 'solid-js'


export function RightBar() {
  const pop = usePopupControl()
  return (
    <div class="flex h-full w-60 shrink-0 flex-col p-0.5">
      <WorkSpaces />
      <div class="h-[1px] w-full bg-[var(--border-primary)]" />
      <div class="flex h-full flex-col gap-0.5 overflow-auto pt-0.5">
        <For each={pop.copies}>
          {(id) => (
            <ul>
              <CopyPopup copyId={id} onCancel={(id) => pop.cancelCopy(id)} />
            </ul>
          )}
        </For>
      </div>
    </div>
  )
}
