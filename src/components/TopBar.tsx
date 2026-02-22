import { ArrowLeft, ArrowRight, MagnifyingGlass, CaretRight, Gear } from 'phosphor-solid'
import { useNavigationStore } from '@/stores/NavigationStore.ts'
import { useConfigStore } from '@/stores/ConfigStore'
import { Show, For } from 'solid-js'

export function TopBar() {
  const nav = useNavigationStore()
  const conf = useConfigStore()
  return (
    <>
      <div class="flex h-10 w-[100%] flex-row gap-0.5 p-[3px] pr-[3px] pl-[4px]">
        <button
          data-component="Button"
          type="button"
          class="flex w-10 flex-row items-center justify-center rounded-xl hover:bg-[var(--bg-hover-primary)]"
          onClick={() => nav.goBackPath()}
        >
          <ArrowLeft />
        </button>
        <button
          data-component="Button"
          type="button"
          class="flex w-10 flex-row items-center justify-center rounded-xl hover:bg-[var(--bg-hover-primary)]"
          onClick={() => nav.goNextPath()}
        >
          <ArrowRight />
        </button>
        <div class="flex w-full overflow-hidden">
          <div
            data-content="Path-Visor"
            class="scrollbar-none flex h-full w-full items-center overflow-x-scroll overflow-y-hidden rounded-tl-xl rounded-bl-xl bg-[var(--bg-tertiary)] pl-3 text-[0.9rem] whitespace-nowrap"
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
          <button class="ml-auto flex w-10 flex-row items-center justify-center rounded-tr-xl rounded-br-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover-primary)]">
            <MagnifyingGlass />
          </button>
        </div>
        <button
          class="items center flex w-10 items-center justify-center rounded-full hover:bg-[var(--bg-hover-primary)]"
          onClick={() => conf.toggleShowConfig(!conf.configIsOpen)}
        >
          <Gear weight="regular" />
        </button>
      </div>
    </>
  )
}
