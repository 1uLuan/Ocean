import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

type ConfigType = {
  theme: string;
  toggle_hidden_files: boolean;
  title_bar: boolean;
};

const configJson = invoke<ConfigType>('load_config');

type ConfigStore = {
  config: ConfigType;
  configIsOpen: boolean;
  geralConfig: boolean;
  themesConfig: boolean;

  setConfig: (value: ConfigType) => void;
  toggleShowConfig: (value: boolean) => void;
  setGeralConfig: (value: boolean) => void;
  setThemesConfig: (value: boolean) => void;

  saveConfig: () => void;
  toggleHiddenFiles: () => void;
  changeTheme: (theme: string) => void;
  toggleTitleBar: (value: boolean) => void;
};

export const useConfigStore = create<ConfigStore>((set, get) => {
  const defaultConfig: ConfigType = {
    theme: 'light',
    toggle_hidden_files: false,
    title_bar: true,
  };

  // load saved config asynchronously and update the store when ready
  configJson
    .then((c) => set({ config: c }))
    .catch((e) => {
      // optional: keep default config on error
      console.error('Failed to load config', e);
    });

  return {
    config: defaultConfig,
    configIsOpen: false,
    geralConfig: false,
    themesConfig: false,

    setConfig: (c: ConfigType) =>
      set((state) => ({ config: { ...state.config, ...c } })),
    toggleShowConfig: (value: boolean) => set({ configIsOpen: value }),
    saveConfig: () => {
      const { config } = get();
      invoke('save_config', { config: config });
    },
    toggleHiddenFiles: () => {
      set((state) => ({
        config: {
          ...state.config,
          toggle_hidden_files: !state.config.toggle_hidden_files,
        },
      }));
      get().saveConfig();
    },
    toggleTitleBar(value: boolean) {
      set((state) => ({
        config: {
          ...state.config,
          title_bar: value,
        },
      }));
      get().saveConfig();
    },
    changeTheme: (theme: string) => {
      set((state) => ({
        config: {
          ...state.config,
          theme: theme,
        },
      }));
      get().saveConfig();
    },
    setGeralConfig: (value: boolean) => {
      set({ geralConfig: value, themesConfig: false });
    },
    setThemesConfig: (value: boolean) => {
      set({ themesConfig: value, geralConfig: false });
    },
  };
});
