import { CopyPopup } from '@/components/CopyPopup'
import { usePopupControl } from '@/stores/PopupControl'
import { useSmoothScroll } from '@/hooks/useSmoothScroll'
import { useNavigationStore } from '@/stores/NavigationStore'
import { useFileStore } from '@/stores/FileStore'
import { For, Match, Show, Switch, createSignal } from 'solid-js'
import {
  Plus,
  NumberSquareOne,
  NumberSquareTwo,
  NumberSquareThree,
  NumberSquareFour,
} from 'phosphor-solid'

export function RightBar() {
  const pop = usePopupControl()
  const nav = useNavigationStore()
  const fil = useFileStore()

  let listEl: HTMLDivElement | undefined
  useSmoothScroll(() => listEl, { speed: 1.2, smoothness: 0.3 })

  const [tasksOpen, setTasksOpen] = createSignal<boolean>(false)

  return (
    <div class="mr-[3px] ml-[2px] flex h-full w-9 flex-col items-center gap-0.5">
      <div class="relative flex h-auto w-full flex-col rounded-lg">
        <div
          class="absolute left-0 h-9 w-px bg-[var(--accent-primary)] transition-transform duration-100"
          style={{
            transform: `translateY(${nav.actualWorkspace * 36}px)`,
          }}
        />
        <For each={Object.entries(nav.workspaces)}>
          {([idx]) => (
            <button
              class="flex h-9 w-9 items-center justify-center rounded-md hover:bg-[var(--bg-hover-secondary)]"
              onClick={() => {
                nav.setActualWorkspace(Number(idx) as 0 | 1 | 2 | 3)
                fil.setReload(!fil.reload)
              }}
            >
              <Switch>
                <Match when={Number(idx) === 0}>
                  <NumberSquareOne />
                </Match>
                <Match when={Number(idx) === 1}>
                  <NumberSquareTwo />
                </Match>
                <Match when={Number(idx) === 2}>
                  <NumberSquareThree />
                </Match>
                <Match when={Number(idx) === 3}>
                  <NumberSquareFour />
                </Match>
              </Switch>
            </button>
          )}
        </For>
        <button class="flex h-9 w-9 flex-row items-center justify-center rounded-md hover:bg-[var(--bg-hover-secondary)]">
          <Plus weight="regular" />
        </button>
      </div>
      <div class="h-px w-full bg-[var(--border-secondary)]" />
      <button class="h-full w-full" onClick={() => setTasksOpen(!tasksOpen())} />
      <Show when={tasksOpen()}>
        <div class="absolute right-11 bottom-7 h-96 w-xs rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-secondary)] p-1">
          <div ref={listEl} class="relative flex h-full flex-col gap-0.5 overflow-scroll">
            <For each={pop.copies}>
              {(id) => <CopyPopup copyId={id} onCancel={(id) => pop.cancelCopy(id)} />}
            </For>
          </div>
        </div>
      </Show>
    </div>
  )
}
