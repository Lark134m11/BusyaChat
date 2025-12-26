import { create } from 'zustand';
import type { Locale } from '../i18n';
import { getDefaultLocale } from '../i18n';

type LocaleState = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('busya_locale') : null;
const initial: Locale =
  stored === 'ru' || stored === 'en' ? stored : getDefaultLocale();

export const useLocale = create<LocaleState>((set) => ({
  locale: initial,
  setLocale: (locale) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('busya_locale', locale);
    }
    set({ locale });
  },
}));
