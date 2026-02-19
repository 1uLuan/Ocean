import { useEffect, useState, useRef, memo } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { icons } from '@/assets'
import { useFileStore, Fileinfo } from '@/stores/FileStore.ts'
import { useNavigationStore } from '@/stores/NavigationStore.ts'
import { useContextMenuStore } from '@/stores/ContextMenuStore.ts'
import { useSmoothScroll } from '@/hooks/useSmoothScroll.ts'
import { convertFileSrc } from '@tauri-apps/api/core'

const thumbnailCache = new Map<string, string>()
const loadingQueue = new Set<string>()

interface ThumbnailImageProps {
  filePath: string
  alt: string
  size?: number
}

const ThumbnailImage = memo(({ filePath, alt, size = 28 }: ThumbnailImageProps) => {
  const [thumbnail, setThumbnail] = useState<string | null>(thumbnailCache.get(filePath) ?? null)
  const cancelledRef = useRef(false)

  useEffect(() => {
    cancelledRef.current = false

    const cached = thumbnailCache.get(filePath)
    if (cached) {
      setThumbnail(cached)
      return
    }

    if (loadingQueue.has(filePath)) {
      const interval = setInterval(() => {
        const result = thumbnailCache.get(filePath)
        if (result && !cancelledRef.current) {
          setThumbnail(result)
          clearInterval(interval)
        }
      }, 50)
      return () => clearInterval(interval)
    }

    loadingQueue.add(filePath)

    invoke('get_thumbnail_cached', { path: filePath, maxSize: size })
      .then((result) => {
        if (!cancelledRef.current) {
          const dataUrl = (result as string).startsWith('data:')
            ? (result as string) // Base64 (SVG)
            : convertFileSrc(result as string) // Caminho de cache (PNG/JPG)

          thumbnailCache.set(filePath, dataUrl)
          setThumbnail(dataUrl)
        }
      })
      .catch((err) => console.error('Erro ao carregar thumbnail:', err))
      .finally(() => loadingQueue.delete(filePath))

    return () => {
      cancelledRef.current = true
    }
  }, [filePath, size])

  return (
    <img
      src={thumbnail ?? icons.Image}
      alt={alt}
      width={size}
      height={size}
      decoding="async"
      loading="lazy"
      className="object-contain"
      style={{
        maxWidth: `${size}px`,
        maxHeight: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
      }}
      onError={(e) => {
        e.currentTarget.src = icons.Image
        e.currentTarget.onerror = null
      }}
    />
  )
})

export function MainContent() {
  const [files, setFiles] = useState<Fileinfo[]>([])
  const goPath = useNavigationStore((state) => state.goPath)
  const workspaces = useNavigationStore((state) => state.workspaces)
  const actualWorkspace = useNavigationStore((state) => state.actualWorkspace)
  const toggleSelected = useFileStore((state) => state.toggleSelected)
  const setSelected = useFileStore((state) => state.setSelected)
  const selectedFiles = useFileStore((state) => state.selectedFiles)
  const isSelected = useFileStore((state) => state.isSelected)
  const setIsLoading = useFileStore((state) => state.setIsLoading)
  const resetSelected = useFileStore((state) => state.resetSelected)
  const reload = useFileStore((state) => state.reload)
  const handleContextMenu = useContextMenuStore((state) => state.handleContextMenu)
  const setIntervalSelected = useFileStore((state) => state.setIntervalSelected)
  const resetInterval = useFileStore((state) => state.resetInterval)
  const intervalSelection = useFileStore((state) => state.intervalSelection)
  const setHome = useNavigationStore((state) => state.setHome)
  const setWorkspacePath = useNavigationStore((state) => state.setWorkspacePath)

  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    setIsLoading(true)
    document.body.style.cursor = 'wait'
    invoke<Fileinfo[]>('hunt_dir', { dirPath: workspaces[actualWorkspace] })
      .then((response) => {
        setFiles(response)
        setIsLoading(false)
        document.body.style.cursor = 'default'
      })
      .catch((error) => {
        console.log(error)
        setIsLoading(false)
        document.body.style.cursor = 'default'
      })
  }, [workspaces, reload])

  useEffect(() => {
    invoke<string>('get_home').then((homePath) => {
      setHome(homePath)
      setWorkspacePath(0)
      setWorkspacePath(1)
      setWorkspacePath(2)
      setWorkspacePath(3)
    })
  }, [])

  // Scroll rápido e responsivo
  useSmoothScroll(listRef as React.RefObject<HTMLElement>, {
    speed: 1.2, // Um pouco mais rápido
    smoothness: 0.3, // Responsivo mas suave
  })

  const headerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const body = listRef.current
    const header = headerRef.current
    if (!body || !header) return

    const syncScroll = () => {
      header.scrollLeft = body.scrollLeft
    }

    body.addEventListener('scroll', syncScroll)

    return () => body.removeEventListener('scroll', syncScroll)
  }, [])

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col rounded-md bg-[var(--bg-primary)]">
      <div ref={headerRef} className="overflow-hidden rounded-t-md bg-[var(--bg-primary)]">
        <div className="grid min-w-[600px] grid-cols-[minmax(200px,1fr)_100px_90px_90px] items-center text-[0.7rem] text-[var(--text-muted)]">
          <div className="pl-1.5">Nome</div>
          <div>Tipo</div>
          <div>Tamanho</div>
          <div>Modificado</div>
        </div>
        <div className="h-[2px] w-full bg-[var(--border-primary)]" />
      </div>
      {files.length === 0 && (
        <div
          className="absolute m-0 grid h-[90%] w-[90%] place-items-center overflow-hidden"
          onContextMenu={handleContextMenu}
        >
          Nenhum Arquivo no Diretorio
        </div>
      )}
      <ul
        ref={listRef}
        className="flex h-full w-full min-w-0 list-none flex-col overflow-scroll"
        onContextMenu={handleContextMenu}
      >
        {files.map((file, indice) => (
          <li key={file.path} className="w-full min-w-0">
            <button
              className={`h-full w-full min-w-[600px] text-left text-[0.8rem] transition-[border-radius] duration-200 ease-in-out ${
                isSelected(file.path)
                  ? 'bg-[var(--bg-hover-secondary)]'
                  : 'hover:bg-[var(--bg-hover-primary)]'
              } `}
              onMouseDown={(e) => {
                if (e.button === 0) {
                  if (e.altKey) {
                    setIntervalSelected([indice])
                    setSelected([file.path])
                    intervalSelection(files)
                  } else if (e.ctrlKey) {
                    resetInterval()
                    toggleSelected(file.path)
                  } else {
                    resetInterval()
                    setSelected([file.path])
                  }
                } else if (e.button === 2 && selectedFiles.length <= 1) {
                  resetInterval()
                  setSelected([file.path])
                }
              }}
              onDoubleClick={() => {
                goPath(file.path)
                resetSelected()
                resetInterval()
              }}
            >
              <div className="grid h-[30px] min-w-0 grid-cols-[28px_minmax(200px,1fr)_96px_84px_90px] items-center gap-1 pl-1">
                {file.ftype === 'Image' ? (
                  <ThumbnailImage filePath={file.path} alt={file.ftype} />
                ) : (
                  <img src={icons[file.ftype]} alt={file.ftype} height={28} width={28} />
                )}
                <div className="overflow-hidden text-ellipsis whitespace-nowrap">{file.name}</div>
                <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[var(--text-secondary)]">
                  {file.ftype}
                </div>
                <div className="overflow-hidden text-[0.8rem] text-ellipsis whitespace-nowrap text-[var(--text-secondary)]">
                  {file.ftype != 'Folder' && file.size}
                </div>
                <div className="text-[0.8rem] text-[var(--text-secondary)]">
                  {file.last_modified}
                </div>
              </div>
            </button>
          </li>
        ))}
        <li
          className="h-full w-full min-w-[600px]"
          onContextMenu={handleContextMenu}
          onMouseDown={(e) => {
            if (e.button === 0 && e.altKey) {
              setIntervalSelected([files.length])
              intervalSelection(files)
            } else if (e.button === 0) {
              resetInterval()
              resetSelected()
            }
          }}
        />
      </ul>
    </div>
  )
}
