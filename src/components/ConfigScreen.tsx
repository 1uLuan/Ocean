import { useConfigStore } from '@/stores/ConfigStore'
import { createEffect, createSignal, For } from 'solid-js'

export function ConfigScreen() {
  const conf = useConfigStore()

  const [activeCategory, setActiveCategory] = createSignal<'geral' | 'themes'>(
    conf.geralConfig ? 'geral' : conf.themesConfig ? 'themes' : 'geral'
  )

  const configButtons: Record<string, () => void> = {
    Geral: () => {
      conf.setGeralConfig(true)
      setActiveCategory('geral')
    },
    Temas: () => {
      conf.setThemesConfig(true)
      setActiveCategory('themes')
    },
  }

  createEffect(() => {
    console.log(conf.config)
  })

  return (
    <>
      {conf.configIsOpen && (
        <div class="flex h-full w-full flex-col rounded-xl">
          <div class="m-0.5 flex h-full flex-row">
            <div class="w-autos h-full rounded-l-lg border-t border-b border-l border-[var(--border-secondary)] bg-[var(--bg-primary)] p-2">
              <For each={Object.entries(configButtons)}>
                {([nome, action]) => (
                  <button
                    class="h-8 w-full p-1 pr-6 text-left text-[0.9rem] text-[var(--text-primary)] hover:rounded-lg hover:bg-[var(--bg-hover-primary)]"
                    onClick={action}
                  >
                    <div class="flex pl-4.5">{nome}</div>
                  </button>
                )}
              </For>
            </div>
            <div class="relative flex h-full w-full flex-col overflow-hidden rounded-r-lg border border-[var(--border-secondary)] bg-[var(--bg-secondary)] pt-3 pl-1 text-[0.9rem]">
              <div
                aria-hidden={activeCategory() !== 'geral'}
                class={`absolute inset-0 p-3 transition-[opacity,position.y] duration-200 ease-in-out ${
                  activeCategory() === 'geral'
                    ? 'pointer-events-auto translate-x-0 opacity-100'
                    : 'pointer-events-none translate-y-6 opacity-0'
                }`}
              >
                <div class="flex flex-row pl-2">
                  Title Bar
                  <button
                    class={`con ml-1 flex h-4 w-8 flex-row self-center rounded-full bg-amber-600 ${
                      conf.config.title_bar ? 'place-content-end' : 'place-content-start'
                    } `}
                    onClick={() => {
                      conf.toggleTitleBar(!conf.config.title_bar)
                    }}
                  >
                    <div class="h-4 w-4 rounded-full bg-amber-950"></div>
                  </button>
                </div>
              </div>

              <div
                aria-hidden={activeCategory() !== 'themes'}
                class={`absolute inset-0 p-3 transition-[opacity,position.y] duration-200 ease-in-out ${
                  activeCategory() === 'themes'
                    ? 'pointer-events-auto translate-x-0 opacity-100'
                    : 'pointer-events-none translate-y-6 opacity-0'
                }`}
              >
                Selecionar Tema
                <button
                  class="h-6 w-full rounded-md pl-2 text-left hover:bg-[var(--bg-hover-primary)]"
                  onClick={() => conf.changeTheme('light')}
                >
                  Light
                </button>
                <button
                  class="h-6 w-full rounded-md pl-2 text-left hover:bg-[var(--bg-hover-primary)]"
                  onClick={() => conf.changeTheme('dark')}
                >
                  Dark
                </button>
                <button
                  class="h-6 w-full rounded-md pl-2 text-left hover:bg-[var(--bg-hover-primary)]"
                  onClick={() => conf.changeTheme('ocean')}
                >
                  Ocean
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
