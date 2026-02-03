import { create } from 'zustand';

export type Fileinfo = {
  name: string;
  ftype: string;
  last_modified: number;
  size: number;
  path: string;
};

type FileStore = {
  files: Fileinfo[];
  selectedFiles: string[];
  copySelected: string[];
  intervalSelected: number[];
  isLoading: boolean;
  reload: boolean;

  setFiles: (files: Fileinfo[]) => void;
  toggleSelected: (selectedFiles: string) => void;
  setSelected: (selectedFiles: string[]) => void;
  setCopySelected: (copySelected: string[]) => void;
  setIntervalSelected: (intervalSelected: number[]) => void;
  resetInterval: () => void;
  resetSelected: () => void;
  setIsLoading: (isLoading: boolean) => void;
  setReload: (reload: boolean) => void;
  isSelected: (value: string) => boolean;
  intervalSelection: (files: Fileinfo[]) => void;
};

export const useFileStore = create<FileStore>((set, get) => ({
  files: [],
  selectedFiles: [],
  copySelected: [],
  intervalSelected: [],
  isLoading: false,
  reload: false,

  setFiles: (fl: Fileinfo[]) => set({ files: fl }),
  toggleSelected: (file: string) =>
    set((state) => ({
      selectedFiles: state.selectedFiles.includes(file)
        ? state.selectedFiles.filter((f) => f !== file)
        : [...state.selectedFiles, file],
    })),
  setSelected: (file: string[]) =>
    set({
      selectedFiles: file,
    }),
  setCopySelected: (fileSelecteds: string[]) =>
    set({ copySelected: fileSelecteds }),
  setIntervalSelected: (interval: number[]) =>
    set((state) => ({
      intervalSelected:
        state.intervalSelected.length === 2
          ? interval
          : [...state.intervalSelected, ...interval],
    })),
  resetInterval: () => set({ intervalSelected: [] }),
  resetSelected: () => set({ selectedFiles: [] }),
  setIsLoading: (il: boolean) => set({ isLoading: il }),
  setReload: (rl: boolean) => set({ reload: rl }),

  isSelected: (fileName: string) => {
    const { selectedFiles } = get();
    return selectedFiles.includes(fileName);
  },

  intervalSelection: (files: Fileinfo[]) => {
    const { intervalSelected } = get();
    if (intervalSelected.length === 2) {
      const { toggleSelected } = get();
      const { resetSelected } = get();
      resetSelected();

      const f = Math.min(...intervalSelected);
      const l = Math.max(...intervalSelected);

      for (let i = f; i <= l; i++) {
        toggleSelected(files[i].path);
      }
      console.log(intervalSelected);
    }
  },
}));
