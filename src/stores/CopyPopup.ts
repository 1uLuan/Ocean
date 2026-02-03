import { invoke } from '@tauri-apps/api/core';
import { useFileStore } from './FileStore';
import { create } from 'zustand';

type CopyPopup = {
  copyProgress: boolean;
  progress: number;
  fileOnCopy: string;
  total: number;
  elapsed_secs: number;
  setShowCopyProgress: (value: boolean) => void;
  setProgress: (v: number) => void;
  setFileOnCopy: (v: string) => void;
  setTotal: (v: number) => void;
  setElapsed_secs: (v: number) => void;
  cancelCopy: () => void;
};

export type TypeCopyProgress = {
  current: number;
  file: string;
  percent: number;
  file_percent: number;
  total: number;
  elapsed_secs: number;
  copied_bytes: number;
  total_bytes: number;
};

export const useCopyPopupStore = create<CopyPopup>((set, get) => ({
  copyProgress: false,
  progress: 0,
  fileOnCopy: '',
  total: 0,
  elapsed_secs: 0,
  setShowCopyProgress: (sc: boolean) => set({ copyProgress: sc }),
  setProgress: (v: number) => set({ progress: v }),
  setFileOnCopy: (v: string) => set({ fileOnCopy: v }),
  setTotal: (v: number) => set({ total: v }),
  setElapsed_secs: (v: number) => set({ elapsed_secs: v }),

  cancelCopy: async () => {
    const { setShowCopyProgress } = get();
    const reload = useFileStore.getState().reload;
    const setReload = useFileStore.getState().setReload;
    await invoke('cancel_func');
    setShowCopyProgress(false);

    setReload(!reload);
  },
}));
