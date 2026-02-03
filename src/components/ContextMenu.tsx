import { JSX, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useContextMenuStore } from '../stores/ContextMenuStore.ts';
import { useConfigStore } from '../stores/ConfigStore.ts';
import { useFileStore } from '../stores/FileStore.ts';
import { useNavigationStore } from '@/stores/NavigationStore.ts';
import {
  CopyIcon,
  CaretRightIcon,
  PenNibIcon,
  ClipboardIcon,
  TrashIcon,
  EyeIcon,
  TerminalWindowIcon,
  FolderSimpleIcon,
  EyeSlashIcon,
  ScissorsIcon,
  CardsIcon,
  FileIcon,
} from '@phosphor-icons/react';

type MenuActions = {
  label: string;
  icon?: JSX.Element | null;
  onClick?: () => void;
  onMouseEnter: () => void;
  disabled: boolean;
};

export function ContextMenu() {
  const showMenu = useContextMenuStore((state) => state.showMenu);
  const showDirMenu = useContextMenuStore((state) => state.showDirMenu);
  const menuPos = useContextMenuStore((state) => state.menuPos);
  const reload = useFileStore((state) => state.reload);
  const selectedFiles = useFileStore((state) => state.selectedFiles);
  const config = useConfigStore((state) => state.config);
  const setShowMenu = useContextMenuStore((state) => state.setShowMenu);
  const setShowDirMenu = useContextMenuStore((state) => state.setShowDirMenu);
  const setReload = useFileStore((state) => state.setReload);
  const setCopySelected = useFileStore((state) => state.setCopySelected);
  const copySelected = useFileStore((state) => state.copySelected);
  const openPopup = useContextMenuStore((state) => state.openPopup);
  const setOnEnter = useContextMenuStore((state) => state.setOnEnter);
  const toggleHiddenFiles = useConfigStore((state) => state.toggleHiddenFiles);
  const pasteDir = useContextMenuStore((state) => state.pasteDir);
  const moveToTrash = useContextMenuStore((state) => state.moveToTrash);
  const moveDir = useContextMenuStore((state) => state.moveDir);
  const makeDir = useContextMenuStore((state) => state.makeDir);
  const makeFile = useContextMenuStore((state) => state.makeFile);
  const handleRename = useContextMenuStore((state) => state.handleRename);
  const path = useNavigationStore((state) => state.path);

  const btnList: MenuActions[] = [
    {
      label: 'Novo',
      icon: <CaretRightIcon weight="light" />,
      onClick: undefined,
      onMouseEnter: () => setShowDirMenu(true),
      disabled: false,
    },
    {
      label: 'Renomear',
      icon: <PenNibIcon weight="light" />,
      onClick: () => {
        setOnEnter(handleRename);
        openPopup();
      },
      onMouseEnter: () => setShowDirMenu(false),
      disabled: false,
    },
    {
      label: 'Copiar',
      icon: <CopyIcon weight="light" />,
      onClick: () => {
        setCopySelected(selectedFiles);
      },
      onMouseEnter: () => setShowDirMenu(false),
      disabled: false,
    },
    {
      label: 'Colar',
      icon: <ClipboardIcon weight="light" />,
      onClick: () => {
        pasteDir();
      },
      onMouseEnter: () => setShowDirMenu(false),
      disabled: copySelected.length === 0,
    },
    {
      label: 'Recortar',
      icon: <ScissorsIcon weight="light" />,
      onClick: () => {
        setCopySelected(selectedFiles);
      },
      onMouseEnter: () => setShowDirMenu(false),
      disabled: false,
    },
    {
      label: 'Colar Recorte',
      icon: <CardsIcon weight="light" />,
      onClick: async () => {
        moveDir();
      },
      onMouseEnter: () => setShowDirMenu(false),
      disabled: false,
    },
    {
      label: 'Excluir',
      icon: <TrashIcon weight="light" />,
      onClick: () => {
        moveToTrash();
      },
      onMouseEnter: () => setShowDirMenu(false),
      disabled: false,
    },
    {
      label: config.toggle_hidden_files
        ? 'Ocultar Arquivos Ocultos'
        : 'Exibir Arquivos Ocultos',
      icon: config.toggle_hidden_files ? (
        <EyeSlashIcon weight="light" />
      ) : (
        <EyeIcon weight="light" />
      ),
      onClick: () => {
        toggleHiddenFiles();
        setReload(!reload);
      },
      onMouseEnter: () => setShowDirMenu(false),
      disabled: false,
    },
    {
      label: 'Abrir Terminal',
      icon: <TerminalWindowIcon weight="light" />,
      onClick: async () => {
        try {
          await invoke('open_terminal', { path });
        } catch (error) {
          console.log(error);
        }
      },
      onMouseEnter: () => setShowDirMenu(false),
      disabled: false,
    },
  ];

  useEffect(() => {
    function disableContextMenu(e: MouseEvent) {
      return e.preventDefault();
    }
    window.addEventListener('contextmenu', disableContextMenu);
    return () => window.removeEventListener('contextmenu', disableContextMenu);
  }, []);
  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowMenu(false);
    }
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  useEffect(() => {
    console.log(selectedFiles);
    console.log(copySelected);
  }, [selectedFiles, copySelected]);

  return (
    <>
      {showMenu && menuPos && (
        <>
          <div
            data-component="Menu-Overlay"
            className="fixed inset-0 w-screen h-screen bg-transparent z-40"
            onMouseDown={(e) => {
              if (e.button === 2) {
                return;
              } else setShowMenu(false);
              setShowDirMenu(false);
            }}
            onContextMenu={() => {
              setShowMenu(false);
              setShowDirMenu(false);
            }}
          />
          <div
            data-component="Context-Menu"
            className="w-[250px] flex flex-col absolute rounded-[8px] p-[4px] z-50 shadow-[0_4px_12px_rgba(0,0,0,0.4)] bg-[var(--bg-tertiary)] border border-[var(--border-secondary)]"
            style={{
              top: Math.min(menuPos.y - 0, window.innerHeight - 275),
              left: Math.min(menuPos.x + 3, window.innerWidth - 260),
            }}
            onClick={() => {
              setShowMenu(false);
              setShowDirMenu(false);
            }}
          >
            {btnList.map((item) => (
              <div key={item.label}>
                {item.label === 'Excluir' && (
                  <>
                    <div className="h-[1px] w-[100%] bg-[var(--text-muted)]" />
                    <div className="h-1 " />
                  </>
                )}
                <button
                  className={`flex items-center h-[25px] w-full text-[12px] rounded-md ${
                    item.disabled
                      ? 'text-[var(--text-muted)]'
                      : 'hover:bg-[var(--bg-hover-secondary)]'
                  }`}
                  onClick={item.onClick}
                  onMouseEnter={item.onMouseEnter}
                  disabled={item.disabled}
                >
                  <div className="flex flex-row items-center pl-2.5 gap-1">
                    {item.icon} {item.label}
                  </div>
                </button>
                {item.label === 'Excluir' && (
                  <>
                    <div className="h-1" />
                    <div className="h-[1px] w-[100%] bg-[var(--text-muted)]" />
                  </>
                )}
              </div>
            ))}
            {/*===========================New_folder_menu===========================*/}
            {showDirMenu && menuPos && showMenu && (
              <div
                className="w-[250px] flex flex-col absolute rounded-[8px] p-[4px] z-50 shadow-[0_4px_12px_rgba(0,0,0,0.4)] bg-[var(--bg-tertiary)] border border-[var(--border-secondary)]"
                style={{
                  top: 0,
                  left: menuPos.x > window.innerWidth - 380 ? -125 : 252,
                  zIndex: 1001,
                  width: 120,
                }}
              >
                <div
                  className="flex items-center h-[25px] w-full  text-[12px] rounded-md hover:bg-[var(--bg-hover-secondary)]"
                  onClick={() => {
                    setOnEnter(makeDir);
                    openPopup();
                  }}
                >
                  <div className="flex flex-row items-center pl-2.5 gap-1">
                    <FolderSimpleIcon /> Pasta
                  </div>
                </div>
                <div
                  className="flex items-center h-[25px] w-full  text-[12px] rounded-md hover:bg-[var(--bg-hover-secondary)]"
                  onClick={() => {
                    setOnEnter(makeFile);
                    openPopup();
                  }}
                >
                  <div className="flex flex-row items-center pl-2.5 gap-1">
                    <FileIcon /> File
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
