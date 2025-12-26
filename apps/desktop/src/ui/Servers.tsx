import React from 'react';
import { useAuth } from '../state/auth';
import { useChat } from '../state/chat';

export function Servers() {
  const auth = useAuth();
  const chat = useChat();

  return (
    <div className="border-r border-white/10 flex flex-col items-center py-3 gap-3">
      <div className="w-12 h-12 rounded-full bg-busya-pink text-busya-night flex items-center justify-center font-extrabold shadow-busyaSoft">
        🐶
      </div>

      <div className="w-full px-2 flex flex-col gap-2">
        {chat.servers.map((s) => {
          const active = s.id === chat.activeServerId;
          return (
            <button
              key={s.id}
              onClick={() => auth.accessToken && chat.selectServer(auth.accessToken, s.id)}
              className={[
                'w-full h-12 rounded-full transition shadow-busyaSoft ring-1',
                active ? 'bg-busya-pink text-busya-night ring-busya-pink/60 scale-[1.03]' : 'bg-busya-card/70 text-white ring-white/10 hover:scale-[1.02]',
              ].join(' ')}
              title={s.name}
            >
              <span className="text-lg">🏠</span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto text-[11px] text-white/40 px-2 text-center">
        BusyaDock 🐾
      </div>
    </div>
  );
}
