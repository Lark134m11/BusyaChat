import React, { useMemo, useState } from 'react';
import { useAuth } from '../state/auth';
import { useChat } from '../state/chat';
import { Servers } from './Servers';
import { Channels } from './Channels';
import { Chat } from './Chat';
import { BusyaBadge, BusyaButton } from './Cute';

export function Layout() {
  const auth = useAuth();
  const chat = useChat();
  const [serverName, setServerName] = useState('');

  const title = useMemo(() => {
    const s = chat.servers.find((x) => x.id === chat.activeServerId);
    return s ? s.name : 'BusyaChat';
  }, [chat.activeServerId, chat.servers]);

  return (
    <div className="h-full w-full bg-busya-night text-white">
      <div className="h-full grid grid-cols-[76px_260px_1fr]">
        <Servers />
        <div className="border-r border-white/10 flex flex-col">
          <div className="p-3 border-b border-white/10 flex items-center justify-between">
            <div className="font-bold">{title}</div>
            <BusyaBadge text="Буся онлайн 🐶" />
          </div>

          <div className="p-3 flex gap-2">
            <input
              className="w-full rounded-busya bg-busya-card/70 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-busya-pink/60"
              placeholder="Новый сервер (например: Работа)"
              value={serverName}
              onChange={(e) => setServerName(e.target.value)}
            />
            <BusyaButton
              cute
              onClick={async () => {
                if (!auth.accessToken) return;
                await chat.createServer(auth.accessToken, serverName || 'Мой сервер 🐾');
                setServerName('');
                await chat.loadServers(auth.accessToken);
              }}
            >
              +
            </BusyaButton>
          </div>

          <Channels />
        </div>

        <Chat />

        <button
          onClick={() => auth.logout()}
          className="absolute bottom-3 left-3 rounded-full bg-busya-card/70 px-3 py-2 text-xs text-white/70 hover:text-white ring-1 ring-white/10"
          title="Выйти"
        >
          🚪 выйти
        </button>
      </div>
    </div>
  );
}
