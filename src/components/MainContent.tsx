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
    const filePath = props.filePath
    const size = props.size ?? 38
    let cancelled = false

    const cached = thumbnailCache.get(filePath)
    if (cached) {
      setThumbnail(cached)
      return
    }

    if (loadingQueue.has(filePath)) {
      const interval = setInterval(() => {
        const result = thumbnailCache.get(filePath)
        if (result && !cancelled) {
          setThumbnail(result)
          clearInterval(interval)
        }
      }, 50)
      onCleanup(() => clearInterval(interval))
      return
    }

    loadingQueue.add(filePath)
    invoke('get_thumbnail_cached', { path: filePath, maxSize: size })
      .then((result) => {
        if (!cancelled) {
          const dataUrl = (result as string).startsWith('data:')
            ? (result as string)
            : convertFileSrc(result as string)
          thumbnailCache.set(filePath, dataUrl)
          setThumbnail(dataUrl)
        }
      })
      .catch((err) => console.error('Erro ao carregar thumbnail:', err))
      .finally(() => loadingQueue.delete(filePath))

    onCleanup(() => {
      cancelled = true
    })
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
    const reload = fil.reload
    reload
    const workspace = nav.workspaces[nav.actualWorkspace]
    workspace

    fil.setIsLoading(true)
    document.body.style.cursor = 'wait'
    invoke<Fileinfo[]>('hunt_dir', { dirPath: nav.workspaces[nav.actualWorkspace] })
      .then((response) => {
        fil.setFiles(response)
        fil.setIsLoading(false)
        document.body.style.cursor = 'default'
      })
      .catch((error) => {
        console.log(error)
        fil.setIsLoading(false)
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

    // Scroll rápido e responsivo
    useSmoothScroll(() => el!, {
      speed: 1.0,
      smoothness: 0.2,
      lock: altPressed,
    })

    const syncScroll = () => {
      headerRef.scrollLeft = el!.scrollLeft
    }

    el!.addEventListener('scroll', syncScroll)

    onCleanup(() => el!.removeEventListener('scroll', syncScroll))
  })

  return (
    <Show when={!conf.configIsOpen}>
      <div class="flex h-full min-h-0 w-full min-w-0 flex-col bg-[var(--bg-primary)]">
        <div
          ref={headerRef!}
          class="grid h-8 min-w-[600px] grid-cols-[minmax(200px,1fr)_100px_90px_90px] items-center text-[0.7rem] text-[var(--text-muted)]"
        >
          <div class="pl-1.5">Nome</div>
          <div>Tipo</div>
          <div>Tamanho</div>
          <div>Modificado</div>
        </div>
        <div class="h-px w-full shrink-0 bg-[var(--border-secondary)]" />
        <ul
          ref={(listEl) => setlistEl(listEl)}
          class="flex h-full w-full min-w-0 list-none flex-col overflow-scroll"
          onContextMenu={cont.handleContextMenu}
        >
          <For each={fil.files}>
            {(file, index) => (
              <li class="w-full min-w-0">
                <button
                  class={`h-full w-full min-w-[600px] text-left text-[0.8rem] ${
                    fil.isSelected(file.path)
                      ? 'bg-[var(--bg-hover-secondary)]'
                      : 'hover:bg-[var(--bg-hover-primary)]'
                  } `}
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
                    } else if (e.button === 2 && fil.selectedFiles.length <= 1) {
                      fil.resetInterval()
                      fil.setSelected([file.path])
                    }
                  }}
                  onDblClick={() => {
                    if (file.ftype === 'Folder') {
                      nav.goPath(file.path)
                      fil.resetSelected()
                      fil.resetInterval()
                    }
                  }}
                >
                  <div class="grid h-[38px] min-w-0 grid-cols-[38px_minmax(200px,1fr)_96px_84px_90px] items-center gap-0.5 pl-1">
                    <Show
                      when={file.ftype === 'Image'}
                      fallback={
                        <img src={icons[file.ftype]} alt={file.ftype} height={38} width={38} />
                      }
                    >
                      <ThumbnailImage filePath={file.path} alt={file.ftype} />
                    </Show>
                    <div class="ml-2 overflow-hidden text-ellipsis whitespace-nowrap">
                      {file.name}
                    </div>
                    <div class="overflow-hidden text-ellipsis whitespace-nowrap text-[var(--text-secondary)]">
                      {file.ftype}
                    </div>
                    <div class="overflow-hidden text-[0.8rem] text-ellipsis whitespace-nowrap text-[var(--text-secondary)]">
                      {file.ftype != 'Folder' && file.size}
                    </div>
                    <div class="text-[0.8rem] text-[var(--text-secondary)]">
                      {file.last_modified}
                    </div>
                  </div>
                </button>
              </li>
            )}
          </For>

          <Show
            when={fil.files.length === 0}
            fallback={
              <li
                class="h-full w-full min-w-[600px]"
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
              Nenhum Arquivo no Diretorio
            </div>
          </Show>
        </ul>
      </div>
    </Show>
  )
}
