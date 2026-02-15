import { create } from 'zustand';

type PopupControl = {
  warningPopup: boolean;
  setWarningPopup: (value: boolean) => void;
};

export const usePopupControl = create<PopupControl>((set) => ({
  warningPopup: false,

  setWarningPopup: (value) => set({ warningPopup: value }),
}));
