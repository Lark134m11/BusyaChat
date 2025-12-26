import React from 'react';
import { useAuth } from '../state/auth';
import { useChat } from '../state/chat';
import { useLocale } from '../state/locale';
import { t } from '../i18n';

export function Servers() {
  const auth = useAuth();
  const chat = useChat();
  const locale = useLocale((s) => s.locale);

  return (
    <div className="border-r border-white/10 flex flex-col items-center py-3 gap-3">
      <button
        className={[
          'w-12 h-12 rounded-full font-extrabold shadow-busyaSoft ring-1 transition',
          chat.view === 'direct'
            ? 'bg-busya-pink text-busya-night ring-busya-pink/60 scale-[1.03]'
            : 'bg-busya-card/70 text-white ring-white/10 hover:scale-[1.02]',
        ].join(' ')}
        onClick={() => {
          if (!auth.accessToken) return;
          chat.showDirects();
          chat.loadDirectThreads(auth.accessToken);
        }}
        title={t(locale, 'servers.dmTitle')}
      >
        DM
      </button>

      <div className="w-full px-2 flex flex-col gap-2">
        {chat.servers.map((s) => {
          const active = s.id === chat.activeServerId && chat.view === 'server';
          return (
            <button
              key={s.id}
              onClick={() => auth.accessToken && chat.selectServer(auth.accessToken, s.id)}
              className={[
                'w-full h-12 rounded-full transition shadow-busyaSoft ring-1',
                active
                  ? 'bg-busya-pink text-busya-night ring-busya-pink/60 scale-[1.03]'
                  : 'bg-busya-card/70 text-white ring-white/10 hover:scale-[1.02]',
              ].join(' ')}
              title={s.name}
            >
              <span className="text-sm font-bold">{s.name.slice(0, 2).toUpperCase()}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto text-[11px] text-white/40 px-2 text-center">BusyaDock v3</div>
    </div>
  );
}
