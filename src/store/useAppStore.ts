import { create } from 'zustand';

export type AppMode = 'manager' | 'downloader';

interface AppState {
  mode: AppMode;
  isBusy: boolean;
  setMode: (mode: AppMode) => void;
  setIsBusy: (busy: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  mode: 'manager',
  isBusy: false,
  setMode: (mode) => set({ mode }),
  setIsBusy: (busy) => set({ isBusy: busy }),
}));
