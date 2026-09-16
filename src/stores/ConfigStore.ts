import { createStore } from 'solid-js/store'
import { invoke } from '@tauri-apps/api/core'
import { useFileStore } from './FileStore'

const fil = useFileStore()

type ConfigType = {
  theme: string
  toggle_hidden_files: boolean
  title_bar: boolean
}

const defaultConfig: ConfigType = {
  theme: 'light',
  toggle_hidden_files: false,
  title_bar: true,
}

type ConfigState = {
  config: ConfigType
  configIsOpen: boolean
  geralConfig: boolean
  themesConfig: boolean
  workspaceActive: boolean
}

const [state, setState] = createStore<ConfigState>({
  config: defaultConfig,
  configIsOpen: false,
  geralConfig: false,
  themesConfig: false,
  workspaceActive: false,
})

invoke<ConfigType>('load_config')
  .then((c) => setState({ config: c }))
  .catch((e) => console.error('Failed to load config', e))

function setConfig(value: Partial<ConfigType>) {
  setState('config', (prev) => ({ ...prev, ...value }))
}

function toggleShowConfig(value: boolean) {
  setState({ configIsOpen: value })
}

function setGeralConfig(value: boolean) {
  setState({ geralConfig: value, themesConfig: false })
}

function setThemesConfig(value: boolean) {
  setState({ themesConfig: value, geralConfig: false })
}

function saveConfig() {
  invoke('save_config', { config: state.config })
}

function toggleHiddenFiles() {
  setState('config', 'toggle_hidden_files', (prev) => !prev)
  fil.resetSelected()
  fil.resetInterval()
  saveConfig()
}

function toggleTitleBar(value: boolean) {
  setState('config', 'title_bar', value)
  saveConfig()
}

function changeTheme(theme: string) {
  setState('config', 'theme', theme)
  saveConfig()
}

function toggleWorkspaceActive(value: boolean) {
  setState('workspaceActive', value)
}

export const useConfigStore = () => ({
  get config() {
    return state.config
  },
  get configIsOpen() {
    return state.configIsOpen
  },
  get geralConfig() {
    return state.geralConfig
  },
  get themesConfig() {
    return state.themesConfig
  },
  get workspaceActive() {
    return state.workspaceActive
  },
  setConfig,
  toggleShowConfig,
  setGeralConfig,
  setThemesConfig,
  saveConfig,
  toggleHiddenFiles,
  toggleTitleBar,
  changeTheme,
  toggleWorkspaceActive,
})
