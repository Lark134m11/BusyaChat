import React, { useState } from 'react';
import { useAuth } from '../state/auth';
import { useLocale } from '../state/locale';
import { t } from '../i18n';
import { BusyaBadge, BusyaButton, BusyaInput } from './Cute';
import { LanguageSwitch } from './LanguageSwitch';

export function Register({ onSwitch }: { onSwitch: () => void }) {
  const auth = useAuth();
  const locale = useLocale((s) => s.locale);
  const [username, setUsername] = useState('Busya');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="w-full max-w-md rounded-busya bg-busya-card/60 p-6 shadow-busya ring-1 ring-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="text-2xl font-extrabold text-white busya-title">{t(locale, 'app.name')}</div>
          <div className="flex items-center gap-2">
            <BusyaBadge text={t(locale, 'badge.register')} />
            <LanguageSwitch />
          </div>
        </div>

        <div className="space-y-3">
          <BusyaInput
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={t(locale, 'auth.username')}
          />
          <BusyaInput value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t(locale, 'auth.email')} />
          <BusyaInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t(locale, 'auth.passwordHint')}
            type="password"
          />

          {auth.error && <div className="text-sm text-busya-pink">{auth.error}</div>}

          <BusyaButton
            disabled={auth.loading}
            onClick={() => auth.register(email, password, username)}
            className="w-full"
          >
            {auth.loading ? t(locale, 'auth.creating') : t(locale, 'auth.create')}
          </BusyaButton>

          <button className="text-sm text-white/60 hover:text-white" onClick={onSwitch}>
            {t(locale, 'auth.switchToLogin')}
          </button>
        </div>
      </div>
    </div>
  );
}
