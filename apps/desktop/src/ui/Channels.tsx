import React, { useMemo, useState } from 'react';
import { useAuth } from '../state/auth';
import { useChat } from '../state/chat';
import { http } from '../api/http';

const ROLE_OPTIONS = ['MEMBER', 'MOD', 'ADMIN'];

export function Channels() {
  const auth = useAuth();
  const chat = useChat();
  const [name, setName] = useState('');
  const [type, setType] = useState<'TEXT' | 'VOICE'>('TEXT');
  const [minRole, setMinRole] = useState<'MEMBER' | 'MOD' | 'ADMIN'>('MEMBER');

  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState<any[]>([]);

  const unreadMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    chat.channels.forEach((c) => {
      const readAt = c.readStates?.[0]?.lastReadAt ? new Date(c.readStates[0].lastReadAt) : null;
      const lastMsgAt = c.messages?.[0]?.createdAt ? new Date(c.messages[0].createdAt) : null;
      if (lastMsgAt && (!readAt || lastMsgAt > readAt)) map[c.id] = true;
    });
    return map;
  }, [chat.channels]);

  if (chat.view === 'direct') {
    return (
      <div className="flex-1 overflow-auto busya-scroll px-3 pb-3">
        <div className="text-xs text-white/50 mb-2">Directs</div>
        <div className="space-y-2 mb-3">
          <input
            className="w-full rounded-busya bg-busya-card/70 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-busya-pink/60"
            placeholder="Search users to DM"
            value={userQuery}
            onChange={async (e) => {
              const v = e.target.value;
              setUserQuery(v);
              if (!auth.accessToken || v.trim().length < 2) {
                setUserResults([]);
                return;
              }
              const users = await http.searchUsers(auth.accessToken, v.trim());
              setUserResults(users);
            }}
          />
          {userResults.length > 0 && (
            <div className="rounded-busya bg-busya-card/60 ring-1 ring-white/10 p-2 space-y-1">
              {userResults.map((u) => (
                <button
                  key={u.id}
                  onClick={async () => {
                    if (!auth.accessToken) return;
                    await chat.startDirect(auth.accessToken, u.id);
                    setUserResults([]);
                    setUserQuery('');
                    await chat.loadDirectThreads(auth.accessToken);
                  }}
                  className="w-full text-left text-sm rounded-busya px-2 py-1 hover:bg-white/5"
                >
                  {u.username}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1">
          {chat.directThreads.map((t) => {
            const active = t.id === chat.activeDirectId;
            const title = t.users.map((u) => u.username).join(', ') || 'Direct';
            return (
              <button
                key={t.id}
                onClick={() => auth.accessToken && chat.selectDirect(auth.accessToken, t.id)}
                className={[
                  'text-left rounded-busya px-3 py-2 text-sm transition ring-1',
                  active
                    ? 'bg-white/10 ring-busya-pink/40'
                    : 'bg-transparent hover:bg-white/5 ring-transparent hover:ring-white/10',
                ].join(' ')}
              >
                <span className="text-white/70">@</span> {title}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto busya-scroll px-3 pb-3">
      <div className="text-xs text-white/50 mb-2">Channels</div>

      <div className="space-y-2 mb-3">
        <input
          className="w-full rounded-busya bg-busya-card/70 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-busya-pink/60"
          placeholder="New channel name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="grid grid-cols-[1fr_1fr_72px] gap-2">
          <select
            className="rounded-busya bg-busya-card/70 px-2 py-2 text-sm text-white ring-1 ring-white/10"
            value={type}
            onChange={(e) => setType(e.target.value as 'TEXT' | 'VOICE')}
          >
            <option value="TEXT">TEXT</option>
            <option value="VOICE">VOICE</option>
          </select>
          <select
            className="rounded-busya bg-busya-card/70 px-2 py-2 text-sm text-white ring-1 ring-white/10"
            value={minRole}
            onChange={(e) => setMinRole(e.target.value as any)}
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button
            className="rounded-busya px-3 py-2 bg-busya-mint text-busya-night font-bold shadow-busyaSoft hover:scale-[1.02] transition"
            onClick={async () => {
              if (!auth.accessToken || !chat.activeServerId) return;
              if (!name.trim()) return;
              await chat.createChannel(auth.accessToken, chat.activeServerId, name.trim(), minRole, type);
              setName('');
            }}
          >
            +
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        {chat.channels.map((c) => {
          const active = c.id === chat.activeChannelId;
          const unread = unreadMap[c.id];
          const icon = c.type === 'VOICE' ? 'V' : '#';
          return (
            <button
              key={c.id}
              onClick={() => auth.accessToken && chat.selectChannel(auth.accessToken, c.id)}
              className={[
                'text-left rounded-busya px-3 py-2 text-sm transition ring-1 flex items-center justify-between',
                active
                  ? 'bg-white/10 ring-busya-pink/40'
                  : 'bg-transparent hover:bg-white/5 ring-transparent hover:ring-white/10',
              ].join(' ')}
            >
              <span className="text-white/60">
                {icon} {c.name}
              </span>
              {unread && <span className="w-2 h-2 rounded-full bg-busya-pink" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
