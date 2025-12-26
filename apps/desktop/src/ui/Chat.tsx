import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../state/auth';
import { useChat } from '../state/chat';

export function Chat() {
  const auth = useAuth();
  const chat = useChat();
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const typingText = useMemo(() => {
    if (!chat.typingUserIds.length) return '';
    if (chat.typingUserIds.length === 1) return 'Кто-то печатает… 🐾';
    return 'Сразу несколько лапок печатают… 🐾🐾';
  }, [chat.typingUserIds]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat.messages.length]);

  useEffect(() => {
    const s = chat.socket;
    if (!s || !chat.activeChannelId) return;

    const t = setTimeout(() => {
      s.emit('typing_stop', { channelId: chat.activeChannelId });
    }, 900);

    return () => clearTimeout(t);
  }, [text, chat.socket, chat.activeChannelId]);

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-white/10 p-3 flex items-center justify-between">
        <div className="font-bold">
          {chat.activeChannelId ? '💬 Чат' : 'Выбери канал'}
        </div>
        <div className="text-xs text-white/50">{typingText}</div>
      </div>

      <div className="flex-1 overflow-auto busya-scroll p-4 space-y-3">
        {!chat.activeChannelId && (
          <div className="text-white/60">
            Буся ждёт, пока ты выберешь канал 🐶✨
          </div>
        )}

        {chat.messages.map((m) => (
          <div key={m.id} className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-busya-card/70 ring-1 ring-white/10 flex items-center justify-center">
              <span>🐾</span>
            </div>
            <div className="flex-1">
              <div className="text-sm">
                <span className="font-bold text-busya-sky">{m.author?.nickname ?? 'Busya'}</span>
                <span className="text-xs text-white/40 ml-2">
                  {new Date(m.createdAt).toLocaleTimeString()}
                </span>
              </div>
              <div className="text-white/90 whitespace-pre-wrap">{m.content}</div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-white/10 p-3">
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-busya bg-busya-card/70 px-4 py-3 text-sm outline-none ring-1 ring-white/10 focus:ring-busya-pink/60"
            placeholder="Напиши что-нибудь бусино… 🐶"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (chat.socket && chat.activeChannelId) {
                chat.socket.emit('typing_start', { channelId: chat.activeChannelId });
              }
            }}
            onKeyDown={async (e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!auth.accessToken) return;
                const msg = text.trim();
                if (!msg) return;
                setText('');
                await chat.send(auth.accessToken, msg);
              }
            }}
          />
          <button
            className="rounded-busya px-4 py-3 bg-busya-pink text-busya-night font-extrabold shadow-busyaSoft hover:scale-[1.02] transition"
            onClick={async () => {
              if (!auth.accessToken) return;
              const msg = text.trim();
              if (!msg) return;
              setText('');
              await chat.send(auth.accessToken, msg);
            }}
            title="Отправить"
          >
            ➤
          </button>
        </div>
        <div className="mt-2 text-xs text-white/40">
          Enter — отправить • Shift+Enter — новая строка • Буся рядом 🐾
        </div>
      </div>
    </div>
  );
}
