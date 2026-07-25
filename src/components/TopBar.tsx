//icons
import ArrowLeft from '~icons/ph/arrow-left'
import ArrowRight from '~icons/ph/arrow-right'
import MagnifyingGlass from '~icons/ph/magnifying-glass'
import CaretRight from '~icons/ph/caret-right'
import Gear from '~icons/ph/gear'
import List from '~icons/ph/list-bold'
import EyeSlash from '~icons/ph/eye-slash'
import Eye from '~icons/ph/eye'
import Plus from '~icons/ph/plus'

import { useNavigationStore } from '@/stores/NavigationStore'
import { useConfigStore } from '@/stores/ConfigStore'
import { useFileStore } from '@/stores/FileStore'
import useSmoothScroll from '@/hooks/useSmoothScroll'
import { Show, For, createSignal, createMemo} from 'solid-js'

export function TopBar() {
  const nav = useNavigationStore()
  const conf = useConfigStore()
  const fil = useFileStore()

  let listEl: HTMLDivElement | undefined
  useSmoothScroll(() => listEl, { speed: 1.0, smoothness: 0.3 })

  const [active, setActive] = createSignal(false)

  const btnList = createMemo(() => [
    {
    label: 'Open New Space',
    icon: <Plus/>,
      onClick: () => { nav.addWorkspace(nav.home);  setActive(!active())},
    //onMouseEnter: () => cont.setShowDirMenu(false),
    disabled: false,
    visible: true,
    },
    {
      label: conf.config.toggle_hidden_files ? 'Hide Hidden Files' : 'Show Hidden Files',
      icon: conf.config.toggle_hidden_files ? (
        <EyeSlash />
      ) : (
        <Eye />
      ),
      onClick: () => {
        conf.toggleHiddenFiles()
        fil.setReload(!fil.reload)
        setActive(!active())
      },
      //onMouseEnter: () => cont.setShowDirMenu(false),
      disabled: false,
      visible: true,
    },
    {
    label: 'Configuration',
    icon: <Gear/>,
      onClick: () => { conf.toggleShowConfig(!conf.configIsOpen);  setActive(!active())},
    //onMouseEnter: () => cont.setShowDirMenu(false),
    disabled: false,
    visible: true,
    },
  ])

  return (
    <>
      <div class="flex h-10 w-full flex-row gap-0.5 p-0.5">
        <button
          class="flex w-10 flex-row items-center justify-center rounded-md hover:bg-(--bg-hover-secondary)"
          onClick={() => nav.goBackPath()}
        >
          <ArrowLeft />
        </button>
        <button
          class="flex w-10 flex-row items-center justify-center rounded-md hover:bg-(--bg-hover-secondary)"
          onClick={() => nav.goNextPath()}
        >
          <ArrowRight />
        </button>
        <div class="flex w-full overflow-hidden">
          <div
            ref={listEl}
            class="scrollbar-none flex h-full w-full items-center overflow-x-scroll overflow-y-hidden rounded-lg bg-(--bg-tertiary) pl-3 text-[0.9rem] whitespace-nowrap"
          >
            <Show when={nav.path !== '/'} fallback={<span>/</span>}>
              <For each={nav.path.split('/').filter(Boolean)}>
                {(segment, index) => (
                  <span class="flex items-center">
                    <span>{segment}</span>
                    <Show when={index() < nav.path.split('/').filter(Boolean).length - 1}>
                      <span class="mx-2">
                        <CaretRight class='size-3.5' />
                      </span>
                    </Show>
                  </span>
                )}
              </For>
            </Show>
          </div>
        </div>
        <button class="ml-auto flex w-10 flex-row items-center justify-center rounded-md hover:bg-(--bg-hover-secondary)">
          <MagnifyingGlass />
        </button>
        <button
          class="flex w-10 items-center justify-center rounded-md hover:bg-(--bg-hover-secondary)"
          onClick={() => setActive(!active())}
        >
          <List/>
        </button>
        <Show when={active()}>
          <div
            data-component="Menu-Overlay"
            class="fixed inset-0 z-40 h-screen w-screen bg-transparent"
            onMouseDown={() => {setActive(!active())}}
          />
          <div class='z-50 absolute top-11 p-1 rounded-lg right-0.5 w-64 h-80 border border-(--border-primary) bg-(--bg-modal) shadow-(--shadow-md)'>
            <For each={btnList()}>
              {(item) => (
                <>
                  <Show when={item.visible}>
                    <Show when={['Move To Trash', 'Delete',].includes(item.label)}>
                      <div class="h-px w-full bg-(--border-secondary)" />
                      <div class="h-1" />
                    </Show>
                    <button class={`flex h-7 w-full items-center rounded-sm text-[0.75rem] gap-1 ${
                      item.disabled ? 'text-(--text-muted)' : 'hover:bg-(--bg-card-hover)'
                      }`}
                      onClick={() => {
                        fil.setPlaceIsSelected(false)
                        item.onClick?.()
                        fil.resetSelected()
                        fil.resetInterval()
                      }}
                      //onMouseEnter={() => {if (!item.disabled) item.onMouseEnter?.()}}
                      disabled={item.disabled}
                    >
                      <div class="pl-2.5"> {item.icon} </div> {item.label}
                    </button>

                    <Show when={['Move To Trash', 'Delete'].includes(item.label)}>
                      <div class="h-1" />
                      <div class="h-px w-full bg-(--border-secondary)" />
                    </Show>
                  </Show>
                </>
              )}
            </For>
          </div>
        </Show>
      </div>
    </>
  )
}
