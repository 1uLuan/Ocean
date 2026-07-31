import { createEffect, onMount, onCleanup, createSignal, For, Show } from 'solid-js'
import { invoke } from '@tauri-apps/api/core'
import { icons } from '@/assets'
import { useFileStore, Fileinfo } from '@/stores/FileStore.ts'
import { useNavigationStore } from '@/stores/NavigationStore.ts'
import { useContextMenuStore } from '@/stores/ContextMenuStore.ts'
import { useSmoothScroll } from '@/hooks/useSmoothScroll.ts'
import { convertFileSrc } from '@tauri-apps/api/core'
import { useConfigStore } from '@/stores/ConfigStore'

const thumbnailCache = new Map<string, string>()
const loadingQueue = new Set<string>()

interface ThumbnailImageProps {
  filePath: string
  alt: string
  size?: number
}

export function ThumbnailImage(props: ThumbnailImageProps) {
  const [thumbnail, setThumbnail] = createSignal<string | null>(
    thumbnailCache.get(props.filePath) ?? null
  )

  createEffect(() => {
    // Garante o registro de cancelamento no topo para cobrir todos os retornos (returns)
    let cancelled = false
    onCleanup(() => {
      cancelled = true
    })

    // Acessando props diretamente para manter a reatividade ativa
    const currentPath = props.filePath
    const size = props.size ?? 38

    const cached = thumbnailCache.get(currentPath)
    if (cached) {
      setThumbnail(cached)
      return
    }

    if (loadingQueue.has(currentPath)) {
      const interval = setInterval(() => {
        const result = thumbnailCache.get(currentPath)
        if (result && !cancelled) {
          setThumbnail(result)
          clearInterval(interval)
        }
      }, 50)
      onCleanup(() => clearInterval(interval))
      return
    }

    loadingQueue.add(currentPath)
    invoke('get_thumbnail_cached', { path: currentPath, maxSize: size })
      .then((result) => {
        if (!cancelled) {
          const dataUrl = (result as string).startsWith('data:')
            ? (result as string)
            : convertFileSrc(result as string)
          thumbnailCache.set(currentPath, dataUrl)
          setThumbnail(dataUrl)
        }
      })
      .catch((err) => console.error('Erro ao carregar thumbnail:', err))
      .finally(() => loadingQueue.delete(currentPath))
  })

  return (
    <img
      src={thumbnail() ?? icons.Image}
      alt={props.alt}
      width={props.size ?? 38}
      height={props.size ?? 38}
      decoding="async"
      loading="lazy"
      class="object-contain"
      style={{
        'max-width': `${props.size ?? 38}px`,
        'max-height': `${props.size ?? 38}px`,
        'min-width': `${props.size ?? 38}px`,
        'min-height': `${props.size ?? 38}px`,
      }}
      onError={(e) => {
        e.currentTarget.src = icons.Image
        e.currentTarget.onerror = null
      }}
    />
  )
}

export function MainContent() {
  const nav = useNavigationStore()
  const fil = useFileStore()
  const cont = useContextMenuStore()
  const conf = useConfigStore()

  createEffect(() => {
    // Dependências explícitas controladas
    const reload = fil.reload
    console.log(reload)
    const workspace = nav.workspaces[nav.actualWorkspace]
    if (!workspace) return

    fil.setIsLoading(true)
    document.body.style.cursor = 'wait'

    let isEffectCleaned = false

    invoke<Fileinfo[]>('hunt_dir', { dirPath: workspace })
      .then((response) => {
        if (isEffectCleaned) return
        fil.setFiles(response)
      })
      .catch((error) => {
        console.error(error)
      })
      .finally(() => {
        if (isEffectCleaned) return
        fil.setIsLoading(false)
        document.body.style.cursor = 'default'
      })

    onCleanup(() => {
      isEffectCleaned = true
      document.body.style.cursor = 'default'
    })
  })

  const [altPressed, setAltPressed] = createSignal(false)

  onMount(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Alt') setAltPressed(true)
    }
    const up = (e: KeyboardEvent) => {
      if (e.key === 'Alt') setAltPressed(false)
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    onCleanup(() => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    })
  })

  const [listEl, setlistEl] = createSignal<HTMLUListElement | null>(null)
  let headerRef!: HTMLDivElement

  createEffect(() => {
    const el = listEl()
    if (!el || !headerRef) return

    useSmoothScroll(() => el, {
      speed: 1,
      smoothness: 0.1,
      lock: altPressed,
    })

    const syncScroll = () => {
      headerRef.scrollLeft = el.scrollLeft
    }

    el.addEventListener('scroll', syncScroll)
    onCleanup(() => el.removeEventListener('scroll', syncScroll))
  })

  return (
    <Show when={!conf.configIsOpen}>
      <div class="flex h-full min-h-0 w-full min-w-0 flex-col bg-(--bg-primary)">
        <div
          ref={headerRef}
          class="grid h-8 min-w-150 grid-cols-[minmax(200px,1fr)_100px_90px_90px] items-center text-[0.7rem] text-(--text-muted) overflow-hidden"
        >
          <div class="pl-1.5">Nome</div>
          <div>Tipo</div>
          <div>Tamanho</div>
          <div>Modificado</div>
        </div>
        <div class="h-px w-full shrink-0 bg-(--border-secondary)" />
        <ul
          ref={setlistEl}
          class="flex h-full w-full min-w-0 list-none flex-col overflow-scroll"
        >
          <For each={fil.files}>
            {(file, index) => (
              <li class="w-full min-w-0">
                <div
                  class={`grid h-9.5 w-full min-w-150 grid-cols-[38px_minmax(200px,1fr)_96px_84px_90px] items-center gap-0.5 pl-1 text-left text-[0.8rem] ${
                    fil.isSelected(file.path) && !fil.placeIsSelected
                      ? 'bg-(--bg-hover-secondary)'
                      : 'hover:bg-(--bg-hover-primary)'
                  }`}
                  onDblClick={() => {
                    if (file.ftype === 'folder') {
                      nav.goPath(file.path)
                      fil.resetSelected()
                      fil.resetInterval()
                    }
                  }}
                  onMouseDown={(e) => {
                    if (e.button === 0) {
                      if (e.ctrlKey && e.altKey) {
                        fil.setIntervalSelected([index()])
                        fil.setSelected([file.path])
                        fil.intervalSelection(fil.files)
                      } else if (e.ctrlKey) {
                        fil.resetInterval()
                        fil.toggleSelected(file.path)
                      } else {
                        fil.resetInterval()
                        fil.setSelected([file.path])
                      }
                    }
                  }}
                >
                  {/*Area Esquerda*/}
                  <div class="col-span-2 flex h-full min-w-0 items-center"
                    onContextMenu={(e) => {
                      if (!fil.isSelected(file.path)) {
                        fil.setSelected([file.path])
                      }
                      cont.handleContextMenu(e)
                      }
                    }
                  >
                    <Show
                      when={[
                        'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg',
                        'tiff', 'tif', 'heic', 'heif', 'avif', 'ico',
                      ].includes(file.ftype.toLowerCase())}
                      fallback={
                        <img
                          src={icons[file.ftype] || icons['unknown']}
                          alt={file.ftype}
                          height={38}
                          width={38}
                        />
                      }
                    >
                      <ThumbnailImage filePath={file.path} alt={file.ftype} />
                    </Show>
                    <div class="ml-2 truncate">{file.name}</div>
                  </div>

                  {/*Area Direita*/}
                  <div
                    class="grid h-full w-full grid-cols-[96px_84px_90px] items-center"
                    onContextMenu={(e) => {
                        if (fil.isSelected(file.path)) {
                          cont.handleContextMenu(e)
                        } else {
                          fil.resetInterval()
                          fil.resetSelected()
                          cont.handleContextMenu(e)
                        }
                      }}
                  >
                    <div class="truncate text-(--text-secondary) w-full h-full items-center flex">{file.ftype}</div>
                    <div class="text-[0.8rem] truncate text-(--text-secondary) w-full h-full items-center flex">
                      {file.ftype !== 'folder' && file.size}
                    </div>
                    <div class="text-[0.8rem] text-(--text-secondary) w-full h-full items-center flex">{file.last_modified}</div>
                  </div>
                </div>
              </li>
            )}
          </For>

          <Show
            when={fil.files.length === 0}
            fallback={
              <li
                class="h-full w-full min-w-150"
                onContextMenu={cont.handleContextMenu}
                onMouseDown={(e) => {
                  if (e.button === 0 && e.ctrlKey && e.altKey) {
                    fil.setIntervalSelected([fil.files.length])
                    fil.intervalSelection(fil.files)
                  } else if (e.button === 0) {
                    fil.resetInterval()
                    fil.resetSelected()
                  }
                }}
              />
            }
          >
            <div
              class="grid h-full w-full place-items-center overflow-hidden"
              onContextMenu={cont.handleContextMenu}
            >
              Nenhum Arquivo no Diretório
            </div>
          </Show>
        </ul>
      </div>
    </Show>
  )
}
