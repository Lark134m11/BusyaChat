import React, { useState } from 'react';
import { useAuth } from '../state/auth';
import { useLocale } from '../state/locale';
import { t } from '../i18n';
import { BusyaBadge, BusyaButton, BusyaInput } from './Cute';
import { LanguageSwitch } from './LanguageSwitch';

export function Login({ onSwitch }: { onSwitch: () => void }) {
  const auth = useAuth();
  const locale = useLocale((s) => s.locale);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="w-full max-w-md rounded-busya bg-busya-card/60 p-6 shadow-busya ring-1 ring-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xl font-extrabold text-white">{t(locale, 'app.name')}</div>
          <div className="flex items-center gap-2">
            <BusyaBadge text={t(locale, 'badge.login')} />
            <LanguageSwitch />
          </div>
        </div>

        <div className="space-y-3">
          <BusyaInput value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t(locale, 'auth.email')} />
          <BusyaInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t(locale, 'auth.password')}
            type="password"
          />

          {auth.error && <div className="text-sm text-busya-pink">{auth.error}</div>}

          <BusyaButton disabled={auth.loading} onClick={() => auth.login(email, password)} className="w-full">
            {auth.loading ? t(locale, 'auth.signingIn') : t(locale, 'auth.signIn')}
          </BusyaButton>

          <button className="text-sm text-white/60 hover:text-white" onClick={onSwitch}>
            {t(locale, 'auth.switchToRegister')}
          </button>
        </div>
      </div>
    </div>
  );
}
