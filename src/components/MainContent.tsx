import { createEffect, onMount, onCleanup, createSignal, For, Show } from 'solid-js'
import { invoke } from '@tauri-apps/api/core'
import { icons } from '@/assets'
import { useFileStore, Fileinfo } from '@/stores/FileStore.ts'
import { useNavigationStore } from '@/stores/NavigationStore.ts'
import { useContextMenuStore } from '@/stores/ContextMenuStore.ts'
import { useSmoothScroll, SmoothScrollControls } from '@/hooks/useSmoothScroll.ts'
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

// Distância (em px) da borda do container a partir da qual o auto-scroll começa
const AUTO_SCROLL_EDGE = 48
// Velocidade máxima (px por frame) somada ao alvo de scroll quando o cursor
// está colado na borda
const AUTO_SCROLL_MAX_SPEED = 16
// Movimento mínimo (px, em espaço de conteúdo) antes de considerar que virou
// um arrasto de seleção (evita "flash" do retângulo em cliques simples)
const DRAG_THRESHOLD = 4

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

  // Estado do retângulo de seleção em ESPAÇO DE CONTEÚDO: x/y são a distância
  // desde o topo/esquerda do conteúdo rolável do <ul> (não da tela). Isso é o
  // que permite o retângulo "rolar junto" com a lista de forma consistente e
  // não perder itens que saem da área visível.
  const [dragBox, setDragBox] = createSignal<{ x: number; y: number; w: number; h: number } | null>(
    null
  )

  let scrollControls: SmoothScrollControls | undefined
  let dragOrigin = { x: 0, y: 0 } // em espaço de conteúdo
  let dragBaseSelection: string[] = []
  let isDraggingSelection = false
  let autoScrollRAF: number | null = null
  let lastPointerX = 0
  let lastPointerY = 0
  let activeDragCleanup: (() => void) | null = null
  // Altura/largura REAL do conteúdo, medidas no início do arrasto (antes do
  // retângulo existir no DOM). Usadas para travar o retângulo e impedir que
  // ele "vaze" além do fim da lista — um <li absolute> que ultrapassa o
  // conteúdo aumenta o scrollHeight do <ul>, o que libera mais scroll, o que
  // estica o retângulo ainda mais: um loop infinito de auto-scroll.
  let dragContentHeight = 0
  let dragContentWidth = 0

  // Converte uma coordenada de tela (clientX/clientY) para espaço de conteúdo
  // do container rolável: distância desde o topo/esquerda do conteúdo total,
  // somando o scroll atual. Fica imune a mudanças de scrollTop/scrollLeft.
  const getContentPoint = (el: HTMLElement, clientX: number, clientY: number) => {
    const rect = el.getBoundingClientRect()
    return {
      x: clientX - rect.left + el.scrollLeft,
      y: clientY - rect.top + el.scrollTop,
    }
  }

  const updateDragBox = (clientX: number, clientY: number) => {
    const el = listEl()
    if (!el) return

    const raw = getContentPoint(el, clientX, clientY)
    // Trava nos limites reais do conteúdo (capturados no início do arrasto),
    // nunca no scrollHeight/scrollWidth atual do <ul> — que já pode estar
    // contaminado pelo próprio retângulo de um frame anterior.
    const current = {
      x: Math.max(0, Math.min(raw.x, dragContentWidth)),
      y: Math.max(0, Math.min(raw.y, dragContentHeight)),
    }

    const left = Math.min(dragOrigin.x, current.x)
    const top = Math.min(dragOrigin.y, current.y)
    const width = Math.abs(current.x - dragOrigin.x)
    const height = Math.abs(current.y - dragOrigin.y)

    if (width < DRAG_THRESHOLD && height < DRAG_THRESHOLD) {
      setDragBox(null)
      return
    }

    setDragBox({ x: left, y: top, w: width, h: height })
  }

  const updateIntersections = () => {
    const el = listEl()
    const box = dragBox()
    if (!el || !box) return

    const boxRect = { left: box.x, top: box.y, right: box.x + box.w, bottom: box.y + box.h }
    const rows = el.querySelectorAll<HTMLElement>('[data-file-row]')
    const intersecting: string[] = []

    rows.forEach((row) => {
      // offsetTop/offsetLeft são relativos ao <ul> (nearest positioned
      // ancestor) e não mudam com o scroll — mesmo espaço de coordenadas
      // usado pelo dragBox, então a interseção continua correta mesmo
      // para linhas que saíram da área visível.
      const rowTop = row.offsetTop
      const rowLeft = row.offsetLeft
      const rowBottom = rowTop + row.offsetHeight
      const rowRight = rowLeft + row.offsetWidth

      const hit = !(
        rowRight < boxRect.left ||
        rowLeft > boxRect.right ||
        rowBottom < boxRect.top ||
        rowTop > boxRect.bottom
      )
      if (hit) {
        const path = row.dataset.path
        if (path) intersecting.push(path)
      }
    })

    fil.setSelected(Array.from(new Set([...dragBaseSelection, ...intersecting])))
  }

  const runAutoScroll = () => {
    const el = listEl()
    if (!isDraggingSelection || !el) {
      autoScrollRAF = null
      return
    }

    const rect = el.getBoundingClientRect()
    const distFromTop = lastPointerY - rect.top
    const distFromBottom = rect.bottom - lastPointerY

    let delta = 0
    if (distFromTop < AUTO_SCROLL_EDGE) {
      const intensity = 1 - Math.max(distFromTop, 0) / AUTO_SCROLL_EDGE
      delta = -AUTO_SCROLL_MAX_SPEED * intensity
    } else if (distFromBottom < AUTO_SCROLL_EDGE) {
      const intensity = 1 - Math.max(distFromBottom, 0) / AUTO_SCROLL_EDGE
      delta = AUTO_SCROLL_MAX_SPEED * intensity
    }

    if (delta !== 0) {
      scrollControls?.scrollBy(delta)
      // O scroll muda scrollTop; como origin/current são em espaço de
      // conteúdo, isso estica o retângulo naturalmente (ele "cresce" para
      // acompanhar o que passou a ficar entre o ponto inicial e o cursor)
      updateDragBox(lastPointerX, lastPointerY)
      updateIntersections()
    }

    autoScrollRAF = requestAnimationFrame(runAutoScroll)
  }

  const startDragSelect = (e: MouseEvent) => {
    const el = listEl()
    if (!el) return

    e.preventDefault()
    isDraggingSelection = true
    // Medido AQUI, antes de qualquer setDragBox — nesse momento o retângulo
    // ainda não existe no DOM, então scrollHeight/scrollWidth refletem só o
    // conteúdo real (linhas de arquivo), sem contaminação.
    dragContentHeight = el.scrollHeight
    dragContentWidth = el.scrollWidth
    dragOrigin = getContentPoint(el, e.clientX, e.clientY)
    lastPointerX = e.clientX
    lastPointerY = e.clientY
    document.body.style.userSelect = 'none'

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDraggingSelection) return
      lastPointerX = ev.clientX
      lastPointerY = ev.clientY
      updateDragBox(ev.clientX, ev.clientY)
      updateIntersections()
      if (autoScrollRAF === null) {
        autoScrollRAF = requestAnimationFrame(runAutoScroll)
      }
    }

    const handleMouseUp = () => {
      isDraggingSelection = false
      setDragBox(null)
      document.body.style.userSelect = ''
      if (autoScrollRAF !== null) {
        cancelAnimationFrame(autoScrollRAF)
        autoScrollRAF = null
      }
      activeDragCleanup = null
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    activeDragCleanup = handleMouseUp
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

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
      // Se o componente desmontar no meio de um arrasto, encerra a sessão
      activeDragCleanup?.()
    })
  })

  const [listEl, setlistEl] = createSignal<HTMLUListElement | null>(null)
  let headerRef!: HTMLDivElement

  createEffect(() => {
    const el = listEl()
    if (!el || !headerRef) return

    scrollControls = useSmoothScroll(() => el, {
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
          class="grid h-8 min-w-150 grid-cols-[minmax(200px,1fr)_100px_90px_90px] items-center overflow-hidden text-[0.7rem] text-(--text-muted)"
        >
          <div class="pl-1.5">Nome</div>
          <div>Tipo</div>
          <div>Tamanho</div>
          <div>Modificado</div>
        </div>
        <div class="h-px w-full shrink-0 bg-(--border-secondary)" />
        <ul
          ref={setlistEl}
          class="relative flex h-full w-full min-w-0 list-none flex-col overflow-scroll"
        >
          <For each={fil.files}>
            {(file, index) => (
              <li class="w-full min-w-0">
                <div
                  class="grid h-9.5 w-full min-w-150 grid-cols-[38px_minmax(200px,1fr)_96px_84px_90px] items-center gap-0.5 pl-1 text-left text-[0.8rem]"
                  data-file-row
                  data-path={file.path}
                  classList={{
                    'bg-(--bg-hover-secondary)': fil.isSelected(file.path) && !fil.placeIsSelected,
                    'hover:bg-(--bg-hover-primary)': !(
                      fil.isSelected(file.path) && !fil.placeIsSelected
                    ),
                  }}
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
                  <div
                    class="col-span-2 flex h-full min-w-0 items-center"
                    onContextMenu={(e) => {
                      if (!fil.isSelected(file.path)) {
                        fil.setSelected([file.path])
                      }
                      cont.handleContextMenu(e)
                    }}
                  >
                    <Show
                      when={[
                        'png',
                        'jpg',
                        'jpeg',
                        'gif',
                        'webp',
                        'svg',
                        'tiff',
                        'tif',
                        'heic',
                        'heif',
                        'avif',
                        'ico',
                      ].includes(file.ftype.toLowerCase())}
                      fallback={
                        <img
                          src={icons[file.ftype] || icons['unknown']}
                          alt={file.ftype}
                          height={38}
                          width={38}
                          classList={{ 'opacity-50': file.name.startsWith('.') }}
                        />
                      }
                    >
                      <ThumbnailImage filePath={file.path} alt={file.ftype} />
                    </Show>
                    <div
                      class="ml-2 truncate"
                      classList={{ 'opacity-50': file.name.startsWith('.') }}
                    >
                      {file.name}
                    </div>
                  </div>

                  {/*Area Direita*/}
                  <div
                    class="col-span-3 grid h-full w-full grid-cols-[96px_84px_90px] items-center"
                    onContextMenu={(e) => {
                      if (fil.isSelected(file.path)) {
                        cont.handleContextMenu(e)
                      } else {
                        fil.resetInterval()
                        fil.resetSelected()
                        cont.handleContextMenu(e)
                      }
                    }}
                    onMouseDown={(e) => {
                      if (e.button !== 0) return
                      dragBaseSelection = e.ctrlKey ? [...fil.selectedFiles] : []
                      if (!e.ctrlKey) {
                        fil.resetInterval()
                        fil.resetSelected()
                      }
                      startDragSelect(e)
                    }}
                  >
                    <div
                      class="flex h-full w-full items-center truncate text-(--text-secondary)"
                      classList={{ 'opacity-50': file.name.startsWith('.') }}
                    >
                      {file.ftype}
                    </div>
                    <div
                      class="flex h-full w-full items-center truncate text-[0.8rem] text-(--text-secondary)"
                      classList={{ 'opacity-50': file.name.startsWith('.') }}
                    >
                      {file.ftype !== 'folder' && file.size}
                    </div>
                    <div
                      class="flex h-full w-full items-center text-[0.8rem] text-(--text-secondary)"
                      classList={{ 'opacity-50': file.name.startsWith('.') }}
                    >
                      {file.last_modified}
                    </div>
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
                onContextMenu={(e) => {
                  fil.resetInterval()
                  fil.resetSelected()
                  cont.handleContextMenu(e)
                }}
                onMouseDown={(e) => {
                  if (e.button !== 0) return

                  if (e.ctrlKey && e.altKey) {
                    fil.setIntervalSelected([fil.files.length])
                    fil.intervalSelection(fil.files)
                    return
                  }

                  dragBaseSelection = e.ctrlKey ? [...fil.selectedFiles] : []
                  if (!e.ctrlKey) {
                    fil.resetInterval()
                    fil.resetSelected()
                  }
                  startDragSelect(e)
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

          {/* Retângulo de seleção: filho do <ul>, position absolute em espaço
              de conteúdo. O overflow-scroll do <ul> já clipa automaticamente
              qualquer parte que ultrapasse a área visível da lista, e por ser
              parte do conteúdo, ele rola junto com o resto ao invés de ficar
              fixo na tela. */}
          <Show when={dragBox()}>
            {(box) => (
              <li
                class="pointer-events-none absolute z-50 border"
                style={{
                  left: `${box().x}px`,
                  top: `${box().y}px`,
                  width: `${box().w}px`,
                  height: `${box().h}px`,
                  'background-color': 'rgba(59, 130, 246, 0.15)',
                  'border-color': 'rgba(59, 130, 246, 0.6)',
                }}
              />
            )}
          </Show>
        </ul>
      </div>
    </Show>
  )
}
