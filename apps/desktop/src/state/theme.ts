import { create } from 'zustand';

export type Theme = 'midnight' | 'dawn' | 'pulse';

type ThemeState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('busya_theme') : null;
const initial: Theme = stored === 'dawn' || stored === 'pulse' ? stored : 'midnight';

export const useTheme = create<ThemeState>((set) => ({
  theme: initial,
  setTheme: (theme) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('busya_theme', theme);
    }
    set({ theme });
  },
}));
