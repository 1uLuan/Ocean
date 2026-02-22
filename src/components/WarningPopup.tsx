import { For, createEffect } from 'solid-js'
import { useFileStore } from '@/stores/FileStore'
import { usePopupControl } from '@/stores/PopupControl'
import { useContextMenuStore } from '@/stores/ContextMenuStore'
export function WarningPopup() {
  const fil = useFileStore()
  const pop = usePopupControl()
  const cont = useContextMenuStore()

  createEffect(() => {
    fil.getPathName()
  })

  return (
    <>
      {pop.warningPopup && (
        <div class="absolute z-40 grid h-full w-full place-items-center">
          <div class="z-50 flex h-96 w-80 flex-col gap-1 rounded-xl bg-[var(--bg-tertiary)] p-1 text-[0.9rem]">
            <div class="flex-1">Do You Really Want Delete This Item?</div>
            <ul class="flex-3 rounded-xl border border-zinc-900 bg-[var(--bg-secondary)] p-1">
              <For each={fil.pathName}>{(name) => name}</For>
            </ul>
            <div class="flex flex-row justify-between p-1">
              <button
                class="h-10 w-30 rounded-xl bg-[var(--button-bg)] hover:bg-red-600"
                onClick={() => {
                  ;(cont.delete(), pop.setWarningPopup(false))
                }}
              >
                Delete
              </button>
              <button
                class="h-10 w-30 rounded-xl bg-[var(--button-bg)] hover:bg-[var(--button-hover)]"
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
