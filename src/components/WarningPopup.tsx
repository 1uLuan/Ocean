import { For, createEffect, Show } from 'solid-js'
import { useFileStore } from '@/stores/FileStore'
import { usePopupControl } from '@/stores/PopupControl'
import { useContextMenuStore } from '@/stores/ContextMenuStore'
import useSmoothScroll from '@/hooks/useSmoothScroll'
import { Warning, Trash } from 'phosphor-solid'
export function WarningPopup() {
  const fil = useFileStore()
  const pop = usePopupControl()
  const cont = useContextMenuStore()

  createEffect(() => {
    fil.getPathName()
  })

  let listEl: HTMLDivElement | undefined
  useSmoothScroll(() => listEl, { speed: 1.0, smoothness: 0.4 })

  return (
    <>
      {pop.warningPopup && (
        <div class="absolute z-40 grid h-full w-full place-items-center">
          <div class="z-50 flex h-80 w-80 flex-col gap-1 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-modal)] p-1 text-[0.9rem]">
            <div class="flex w-full flex-row items-center gap-1">
              <Warning weight="fill" size="32" color="var(--accent-warning)" />
              <Show when={fil.pathName.length == 1}>Do You Really Want Delete This Item?</Show>
              <Show when={fil.pathName.length > 1}>Do You Really Want Delete These Items?</Show>
            </div>
            <div
              ref={listEl}
              class="flex-3 overflow-auto rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-1"
            >
              <For each={fil.pathName}>{(name) => <div class="truncate">{name}</div>}</For>
            </div>
            <div class="flex flex-row justify-between p-1">
              <button
                class="flex h-10 w-full flex-row items-center gap-0.5 rounded-xl bg-[var(--button-bg)] hover:bg-[var(--bg-hover-secondary)]"
                onClick={() => {
                  ;(cont.delete(), pop.setWarningPopup(false))
                }}
              >
                <Trash size="20" color="var(--accent-danger)" /> Delete Permanetly
              </button>
              <button
                class="h-10 w-full rounded-xl bg-[var(--button-bg)] hover:bg-[var(--bg-hover-secondary)]"
                onClick={() => pop.setWarningPopup(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
