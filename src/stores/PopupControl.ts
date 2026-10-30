import { createStore } from 'solid-js/store'

type PopupControl = {
  warningPopup: boolean
}

const [state, setState] = createStore<PopupControl>({
  warningPopup: false,
})

function setWarningPopup(value: boolean) {
  setState('warningPopup', value)
}

export const usePopupControl = () => ({
  get warningPopup() {
    return state.warningPopup
  },
  setWarningPopup,
})
