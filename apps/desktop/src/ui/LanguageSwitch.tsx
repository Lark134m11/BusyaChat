import React from 'react';
import { useLocale } from '../state/locale';

export function LanguageSwitch() {
  const locale = useLocale((s) => s.locale);
  const setLocale = useLocale((s) => s.setLocale);

  return (
    <select
      className="rounded-busya bg-busya-card/70 px-2 py-1 text-xs text-white ring-1 ring-white/10"
      value={locale}
      onChange={(e) => setLocale(e.target.value as 'en' | 'ru')}
      aria-label="Language"
    >
      <option value="en">EN</option>
      <option value="ru">RU</option>
    </select>
  );
}
