import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { useNavigationStore } from '@/stores/NavigationStore';
import { useFileStore } from '@/stores/FileStore';
import { useCopyPopupStore } from '@/stores/CopyPopup';

type MenuPosition = { x: number; y: number } | null;

type MenuStore = {
  showMenu: boolean;
  menuPos: MenuPosition;
  showDirMenu: boolean;
  isOpen: boolean; //|-
  text: string; //|----NamePopup!
  onEnter?: () => void; //|-

  setShowMenu: (value: boolean) => void;
  setMenuPos: (value: MenuPosition) => void;
  setShowDirMenu: (value: boolean) => void;
  setIsOpen: (value: boolean) => void; //|-
  setText: (valeu: string) => void; //|----NamePopup!
  setOnEnter: (fn: () => void) => void; //|-

  handleContextMenu: (e: React.MouseEvent) => void;
  handleRename: () => void;
  makeDir: () => void;
  makeFile: () => void;
  openPopup: () => void;
  closePopup: () => void;
  pasteDir: () => void;
  moveToTrash: () => void;
  moveDir: () => void;
};
export const useContextMenuStore = create<MenuStore>((set, get) => ({
  showMenu: false,
  menuPos: null,
  showDirMenu: false,
  isOpen: false,
  text: '',
  onEnter: undefined,

  setShowMenu: (sm: boolean) => set({ showMenu: sm }),
  setMenuPos: (mp: MenuPosition) => set({ menuPos: mp }),
  setShowDirMenu: (sdm: boolean) => set({ showDirMenu: sdm }),
  setOnEnter: (fn: () => void) => set({ onEnter: fn }),
  setIsOpen: (io: boolean) => set({ isOpen: io }),
  setText: (st: string) => set({ text: st }),
  openPopup: () => set({ isOpen: true }),
  closePopup: () => set({ isOpen: false, text: '' }),

  handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    set({
      showMenu: true,
      menuPos: { x: e.pageX, y: e.pageY },
    });
  },
  handleRename: async () => {
    const path = useNavigationStore.getState().path;
    const selectedFiles = useFileStore.getState().selectedFiles;
    const reload = useFileStore.getState().reload;
    const setReload = useFileStore.getState().setReload;
    const resetSelected = useFileStore.getState().resetSelected;
    const { closePopup, text } = get();

    try {
      await invoke('rename_dir', {
        dirPaths: selectedFiles,
        newName: path + '/' + text,
      });
      closePopup();
      setReload(!reload);
      resetSelected();
    } catch (err) {
      console.error(err);
    }
  },
  makeDir: async () => {
    const path = useNavigationStore.getState().path;
    const reload = useFileStore.getState().reload;
    const setReload = useFileStore.getState().setReload;
    const { closePopup, text } = get();

    try {
      await invoke('make_dir', { dirPath: path + '/' + text });
      closePopup();
      setReload(!reload);
    } catch (err) {
      console.error(err);
    }
  },

  makeFile: async () => {
    const path = useNavigationStore.getState().path;
    const reload = useFileStore.getState().reload;
    const setReload = useFileStore.getState().setReload;
    const { closePopup, text } = get();

    try {
      await invoke('make_file', { filePath: path + '/' + text });
      closePopup();
      setReload(!reload);
    } catch (err) {
      console.error(err);
    }
  },
  pasteDir: async () => {
    const path = useNavigationStore.getState().path;
    const reload = useFileStore.getState().reload;
    const setReload = useFileStore.getState().setReload;
    const copySelected = useFileStore.getState().copySelected;
    const setCopySelected = useFileStore.getState().setCopySelected;
    const resetSelected = useFileStore.getState().resetSelected;
    const setShowCopyProgress =
      useCopyPopupStore.getState().setShowCopyProgress;
    const setProgress = useCopyPopupStore.getState().setProgress;

    setShowCopyProgress(true);
    try {
      await invoke('copy_items_to', {
        dirPaths: copySelected,
        targetPath: path,
      });
    } catch (error) {
      console.log(error);
    }
    setReload(!reload);
    resetSelected();
    setShowCopyProgress(false);
    setProgress(0);
    setCopySelected([]);
  },
  moveDir: async () => {
    const actualWorkspace = useNavigationStore.getState().actualWorkspace;
    const workspaces = useNavigationStore.getState().workspaces;
    const reload = useFileStore.getState().reload;
    const setReload = useFileStore.getState().setReload;
    const copySelected = useFileStore.getState().copySelected;
    const setCopySelected = useFileStore.getState().setCopySelected;
    const resetSelected = useFileStore.getState().resetSelected;
    try {
      document.body.style.cursor = 'wait';
      await invoke('move_items_to', {
        dirPaths: copySelected,
        targetPath: workspaces[actualWorkspace],
      });
    } catch (error) {
      console.log(error);
      document.body.style.cursor = 'default';
    } finally {
      document.body.style.cursor = 'default';
    }
    setReload(!reload);
    resetSelected();
    setCopySelected([]);
  },
  moveToTrash: async () => {
    const reload = useFileStore.getState().reload;
    const setReload = useFileStore.getState().setReload;
    const resetSelected = useFileStore.getState().resetSelected;
    const selectedFiles = useFileStore.getState().selectedFiles;
    try {
      await invoke('move_to_trash', { dirPath: selectedFiles });
      setReload(!reload);
      resetSelected();
    } catch (err) {
      console.error(err);
    }
  },
}));
