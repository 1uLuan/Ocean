import { useEffect, useState, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { icons } from '@/assets';
import { useFileStore, Fileinfo } from '@/stores/FileStore.ts';
import { useNavigationStore } from '@/stores/NavigationStore.ts';
import { useContextMenuStore } from '@/stores/ContextMenuStore.ts';
import { useSmoothScroll } from '@/hooks/useSmoothScroll.ts';

export function MainContent() {
  const [files, setFiles] = useState<Fileinfo[]>([]);
  const goPath = useNavigationStore((state) => state.goPath);
  const workspaces = useNavigationStore((state) => state.workspaces);
  const actualWorkspace = useNavigationStore((state) => state.actualWorkspace);
  const toggleSelected = useFileStore((state) => state.toggleSelected);
  const setSelected = useFileStore((state) => state.setSelected);
  const selectedFiles = useFileStore((state) => state.selectedFiles);
  const isSelected = useFileStore((state) => state.isSelected);
  const setIsLoading = useFileStore((state) => state.setIsLoading);
  const resetSelected = useFileStore((state) => state.resetSelected);
  const reload = useFileStore((state) => state.reload);
  const handleContextMenu = useContextMenuStore(
    (state) => state.handleContextMenu,
  );
  const setIntervalSelected = useFileStore(
    (state) => state.setIntervalSelected,
  );
  const resetInterval = useFileStore((state) => state.resetInterval);
  const intervalSelection = useFileStore((state) => state.intervalSelection);
  const setHome = useNavigationStore((state) => state.setHome);
  const setWorkspacePath = useNavigationStore(
    (state) => state.setWorkspacePath,
  );

  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    setIsLoading(true);
    document.body.style.cursor = 'wait';
    invoke<Fileinfo[]>('hunt_dir', { dirPath: workspaces[actualWorkspace] })
      .then((response) => {
        setFiles(response);
        setIsLoading(false);
        document.body.style.cursor = 'default';
      })
      .catch((error) => {
        console.log(error);
        setIsLoading(false);
        document.body.style.cursor = 'default';
      });
  }, [workspaces, reload]);

  useEffect(() => {
    invoke<string>('get_home').then((homePath) => {
      setHome(homePath);
      setWorkspacePath(0);
      setWorkspacePath(1);
      setWorkspacePath(2);
      setWorkspacePath(3);
    });
  }, []);

  // Scroll rápido e responsivo
  useSmoothScroll(listRef as React.RefObject<HTMLElement>, {
    speed: 1.2, // Um pouco mais rápido
    smoothness: 0.4, // Responsivo mas suave
  });

  useEffect(() => {
    console.log('=== MainContent State ===');
    console.log('Workspace:', actualWorkspace);
    console.log('Path:', workspaces[actualWorkspace]);
    console.log('Element existe?', !!listRef.current);
  }, [actualWorkspace, workspaces[actualWorkspace]]);

  return (
    <div className="flex flex-col flex-1 min-h-0 min-w-0">
      {files.length === 0 ? (
        <div
          className="grid m-0 place-items-center w-full h-full overflow-hidden"
          onContextMenu={handleContextMenu}
        >
          Nenhum Arquivo no Diretorio
        </div>
      ) : (
        <ul
          ref={listRef}
          className="flex flex-col list-none overflow-scroll w-full h-full min-w-0"
          onContextMenu={handleContextMenu}
        >
          <li className="sticky top-0 z-20 bg-[var(--bg-primary)] w-full min-w-[600px]">
            <div
              className="grid grid-cols-[minmax(200px,1fr)_100px_90px_90px] items-center text-[0.7rem] text-[var(--text-muted)] bg-[var(--bg-primary)]"
              style={{ background: 'var(--bg-primary)' }}
            >
              <div className="pl-1.5">Nome</div>
              <div>Tipo</div>
              <div>Tamanho</div>
              <div>Modificado</div>
            </div>
            <div className="w-full border-b border-[var(--border-primary)]" />
          </li>
          {files.map((file, indice) => (
            <li key={indice} className="w-full min-w-0">
              <button
                className={`
                h-full w-full text-left text-[0.8rem] min-w-[600px]
                transition-[border-radius] ease-in-out duration-200  
                ${
                  isSelected(file.path)
                    ? 'bg-[var(--bg-hover-secondary)]'
                    : 'hover:bg-[var(--bg-hover-primary)]'
                }
              `}
                onMouseDown={(e) => {
                  if (e.button === 0) {
                    if (e.altKey) {
                      setIntervalSelected([indice]);
                      setSelected([file.path]);
                      intervalSelection(files);
                    } else if (e.ctrlKey) {
                      resetInterval();
                      toggleSelected(file.path);
                    } else {
                      resetInterval();
                      setSelected([file.path]);
                    }
                  } else if (e.button === 2 && selectedFiles.length <= 1) {
                    resetInterval();
                    setSelected([file.path]);
                  }
                }}
                onDoubleClick={() => {
                  goPath(file.path);
                  resetSelected();
                  resetInterval();
                }}
              >
                <div className="grid grid-cols-[28px_minmax(200px,1fr)_96px_84px_90px] gap-1 items-center h-[30px] pl-1 min-w-0">
                  <img
                    src={icons[file.ftype]}
                    alt={file.ftype}
                    width={28}
                    height={28}
                  />
                  <div className="whitespace-nowrap text-ellipsis overflow-hidden ">
                    {file.name}
                  </div>
                  <div className="whitespace-nowrap overflow-hidden text-ellipsis text-[var(--text-secondary)]">
                    {file.ftype}
                  </div>
                  <div className="text-[0.8rem] text-ellipsis whitespace-nowrap overflow-hidden text-[var(--text-secondary)]">
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
            className="w-full h-full min-w-[600px]"
            onContextMenu={handleContextMenu}
            onMouseDown={(e) => {
              if (e.button === 0 && e.altKey) {
                setIntervalSelected([files.length]);
                intervalSelection(files);
              } else if (e.button === 0) {
                resetInterval();
                resetSelected();
              }
            }}
          />
        </ul>
      )}
    </div>
  );
}
