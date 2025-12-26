import React, { useState } from 'react';
import { useAuth } from '../state/auth';
import { useChat } from '../state/chat';
import { http } from '../api/http';

export function Channels() {
  const auth = useAuth();
  const chat = useChat();
  const [name, setName] = useState('');

  return (
    <div className="flex-1 overflow-auto busya-scroll px-3 pb-3">
      <div className="text-xs text-white/50 mb-2">Каналы</div>

      <div className="flex gap-2 mb-3">
        <input
          className="w-full rounded-busya bg-busya-card/70 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-busya-pink/60"
          placeholder="Новый канал (например: мемы)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          className="rounded-busya px-3 py-2 bg-busya-mint text-busya-night font-bold shadow-busyaSoft hover:scale-[1.02] transition"
          onClick={async () => {
            if (!auth.accessToken || !chat.activeServerId) return;
            await http.createChannel(auth.accessToken, chat.activeServerId, name || 'new');
            setName('');
            await chat.selectServer(auth.accessToken, chat.activeServerId);
          }}
        >
          +
        </button>
      </div>

      <div className="flex flex-col gap-1">
        {chat.channels.map((c) => {
          const active = c.id === chat.activeChannelId;
          return (
            <button
              key={c.id}
              onClick={() => auth.accessToken && chat.selectChannel(auth.accessToken, c.id)}
              className={[
                'text-left rounded-busya px-3 py-2 text-sm transition ring-1',
                active
                  ? 'bg-white/10 ring-busya-pink/40'
                  : 'bg-transparent hover:bg-white/5 ring-transparent hover:ring-white/10',
              ].join(' ')}
            >
              <span className="text-white/60">#</span> {c.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
