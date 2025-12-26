import React, { useMemo, useState } from 'react';
import { useAuth } from '../state/auth';
import { useChat } from '../state/chat';
import { Servers } from './Servers';
import { Channels } from './Channels';
import { Chat } from './Chat';
import { Members } from './Members';
import { ServerSettings } from './ServerSettings';
import { BusyaBadge, BusyaButton, BusyaInput } from './Cute';

export function Layout() {
  const auth = useAuth();
  const chat = useChat();
  const [serverName, setServerName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);

  const title = useMemo(() => {
    if (chat.view === 'direct') return 'Directs';
    const s = chat.servers.find((x) => x.id === chat.activeServerId);
    return s ? s.name : 'BusyaChat';
  }, [chat.activeServerId, chat.servers, chat.view]);

  const canOpenSettings = useMemo(() => {
    const s = chat.servers.find((x) => x.id === chat.activeServerId);
    return s?.role === 'OWNER' || s?.role === 'ADMIN' || s?.role === 'MOD';
  }, [chat.activeServerId, chat.servers]);

  return (
    <div className="h-full w-full bg-busya-night text-white">
      <div className="h-full grid grid-cols-[76px_280px_1fr_240px]">
        <Servers />
        <div className="border-r border-white/10 flex flex-col">
          <div className="p-3 border-b border-white/10 flex items-center justify-between">
            <div className="font-bold">{title}</div>
            {chat.view === 'server' ? (
              <button
                className="text-xs text-white/60 hover:text-white"
                onClick={() => setSettingsOpen(true)}
                disabled={!canOpenSettings}
                title="Server settings"
              >
                settings
              </button>
            ) : (
              <BusyaBadge text="soft mode" />
            )}
          </div>

          <div className="p-3 space-y-2">
            <BusyaInput
              value={serverName}
              onChange={(e) => setServerName(e.target.value)}
              placeholder="Create new server"
            />
            <BusyaButton
              cute
              onClick={async () => {
                if (!auth.accessToken || !serverName.trim()) return;
                await chat.createServer(auth.accessToken, serverName.trim());
                setServerName('');
                await chat.loadServers(auth.accessToken);
              }}
              className="w-full"
            >
              Create server
            </BusyaButton>

            <div className="grid grid-cols-[1fr_80px] gap-2">
              <BusyaInput
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Invite code"
              />
              <BusyaButton
                onClick={async () => {
                  if (!auth.accessToken || !inviteCode.trim()) return;
                  await chat.joinInvite(auth.accessToken, inviteCode.trim());
                  setInviteCode('');
                  await chat.loadServers(auth.accessToken);
                }}
              >
                Join
              </BusyaButton>
            </div>
          </div>

          <Channels />
        </div>

        <Chat />
        <Members />

        <button
          onClick={() => auth.logout()}
          className="absolute bottom-3 left-3 rounded-full bg-busya-card/70 px-3 py-2 text-xs text-white/70 hover:text-white ring-1 ring-white/10"
          title="Logout"
        >
          logout
        </button>
      </div>

      <ServerSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
