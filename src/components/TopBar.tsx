import { ArrowLeft, ArrowRight, MagnifyingGlass, CaretRight, Gear } from 'phosphor-solid'
import { useNavigationStore } from '@/stores/NavigationStore.ts'
import { useConfigStore } from '@/stores/ConfigStore'
import useSmoothScroll from '@/hooks/useSmoothScroll'
import { Show, For } from 'solid-js'

export function TopBar() {
  const nav = useNavigationStore()
  const conf = useConfigStore()

  let listEl: HTMLDivElement | undefined
  useSmoothScroll(() => listEl, { speed: 1.0, smoothness: 0.3 })

  return (
    <>
      <div class="flex h-10 w-full flex-row gap-0.5 p-[3px]">
        <button
          data-component="Button"
          type="button"
          class="flex w-10 flex-row items-center justify-center rounded-md hover:bg-[var(--bg-hover-secondary)]"
          onClick={() => nav.goBackPath()}
        >
          <ArrowLeft />
        </button>
        <button
          data-component="Button"
          type="button"
          class="flex w-10 flex-row items-center justify-center rounded-md hover:bg-[var(--bg-hover-secondary)]"
          onClick={() => nav.goNextPath()}
        >
          <ArrowRight />
        </button>
        <div class="flex w-full overflow-hidden">
          <div
            ref={listEl}
            class="scrollbar-none flex h-full w-full items-center overflow-x-scroll overflow-y-hidden rounded-lg bg-[var(--bg-tertiary)] pl-3 text-[0.9rem] whitespace-nowrap"
          >
            <Show when={nav.path !== '/'} fallback={<span>/</span>}>
              <For each={nav.path.split('/').filter(Boolean)}>
                {(segment, index) => (
                  <span class="flex items-center">
                    <span>{segment}</span>
                    <Show when={index() < nav.path.split('/').filter(Boolean).length - 1}>
                      <span class="mx-2">
                        <CaretRight size={14} />
                      </span>
                    </Show>
                  </span>
                )}
              </For>
            </Show>
          </div>
        </div>
        <button class="ml-auto flex w-10 flex-row items-center justify-center rounded-md hover:bg-[var(--bg-hover-secondary)]">
          <MagnifyingGlass />
        </button>
        <button
          class="flex w-10 items-center justify-center rounded-md hover:bg-[var(--bg-hover-secondary)]"
          onClick={() => conf.toggleShowConfig(!conf.configIsOpen)}
        >
          <Gear weight="regular" />
        </button>
      </div>
    </>
  )
}
