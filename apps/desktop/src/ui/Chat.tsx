import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../state/auth';
import { useChat } from '../state/chat';
import { useLocale } from '../state/locale';
import { t } from '../i18n';

type PendingAttachment = {
  id: string;
  filename: string;
};

export function Chat() {
  const auth = useAuth();
  const chat = useChat();
  const locale = useLocale((s) => s.locale);
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:4000';
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [pending, setPending] = useState<PendingAttachment[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const listRef = useRef<HTMLDivElement | null>(null);

  const isDirect = chat.view === 'direct';
  const messages = isDirect ? chat.directMessages : chat.messages;
  const activeChannel = chat.channels.find((c) => c.id === chat.activeChannelId);
  const selfRole = useMemo(() => {
    if (!auth.me?.id) return 'MEMBER';
    return chat.members.find((m) => m.user?.id === auth.me?.id)?.role ?? 'MEMBER';
  }, [auth.me?.id, chat.members]);
  const canModerate = !isDirect && ['MOD', 'ADMIN', 'OWNER'].includes(selfRole);

  const typingText = useMemo(() => {
    if (!chat.typingUserIds.length) return '';
    const names = chat.members
      .filter((m) => chat.typingUserIds.includes(m.user?.id))
      .map((m) => m.user?.username)
      .filter(Boolean) as string[];
    if (names.length === 1) return t(locale, 'chat.isTyping', { name: names[0] });
    if (names.length > 1) return t(locale, 'chat.multipleTyping');
    return t(locale, 'chat.someoneTyping');
  }, [chat.typingUserIds, chat.members, locale]);

  useEffect(() => {
    if (!autoScroll) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, autoScroll]);

  useEffect(() => {
    if (!auth.accessToken) return;
    const last = messages[messages.length - 1];
    if (!last?.id) return;
    if (isDirect) {
      if (!chat.activeDirectId) return;
      chat.markDirectRead(auth.accessToken, chat.activeDirectId, last.id);
    } else {
      if (!chat.activeChannelId) return;
      chat.markRead(auth.accessToken, chat.activeChannelId, last.id);
    }
  }, [
    messages.length,
    isDirect,
    auth.accessToken,
    chat.activeChannelId,
    chat.activeDirectId,
    chat.markRead,
    chat.markDirectRead,
  ]);

  useEffect(() => {
    if (isDirect || !chat.activeChannelId) return;
    const t = setTimeout(() => chat.stopTyping(chat.activeChannelId as string), 900);
    return () => clearTimeout(t);
  }, [text, chat.activeChannelId, isDirect, chat.stopTyping]);

  useEffect(() => {
    if (!chat.voice.channelId) return;
    if (chat.activeChannelId !== chat.voice.channelId) {
      chat.leaveVoice();
    }
  }, [chat.activeChannelId, chat.voice.channelId, chat.leaveVoice]);

  const handleScroll = () => {
    if (!listRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 80);
  };

  const handleSend = async () => {
    if (!auth.accessToken) return;
    const attachments = pending.map((p) => p.id);
    if (!text.trim() && attachments.length === 0) return;
    if (isDirect) {
      await chat.sendDirect(auth.accessToken, text, attachments);
    } else {
      await chat.sendMessage(auth.accessToken, text, attachments);
      if (chat.activeChannelId) chat.stopTyping(chat.activeChannelId);
    }
    setText('');
    setPending([]);
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || !auth.accessToken) return;
    const uploaded = await Promise.all(Array.from(files).map((f) => chat.upload(auth.accessToken!, f)));
    setPending([...pending, ...uploaded.map((u) => ({ id: u.id, filename: u.filename }))]);
  };

  const runSearch = async () => {
    if (!auth.accessToken) return;
    if (isDirect && chat.activeDirectId) {
      await chat.searchDirectMessages(auth.accessToken, chat.activeDirectId, search);
    } else if (!isDirect && chat.activeChannelId) {
      await chat.searchMessages(auth.accessToken, chat.activeChannelId, search);
    }
  };

  useEffect(() => {
    if (search.trim()) return;
    if (isDirect) chat.clearDirectSearch();
    else chat.clearSearch();
  }, [search, isDirect, chat.clearDirectSearch, chat.clearSearch]);

  const voiceActive = chat.voice.channelId && chat.voice.channelId === chat.activeChannelId;
  const canSend = isDirect ? !!chat.activeDirectId : !!chat.activeChannelId;

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-white/10 p-3 flex items-center justify-between gap-2">
        <div className="font-bold">
          {isDirect
            ? t(locale, 'chat.directTitle')
            : activeChannel
              ? `${activeChannel.type === 'VOICE' ? 'V' : '#'} ${activeChannel.name}`
              : t(locale, 'chat.pickChannelTitle')}
        </div>
        <div className="flex-1 max-w-[420px] flex gap-2">
          <input
            className="w-full rounded-busya bg-busya-card/70 px-3 py-2 text-xs outline-none ring-1 ring-white/10 focus:ring-busya-pink/60"
            placeholder={t(locale, 'chat.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') runSearch();
            }}
          />
          <button
            className="rounded-busya px-3 py-2 bg-busya-card/80 text-xs ring-1 ring-white/10 hover:bg-white/10"
            onClick={runSearch}
          >
            {t(locale, 'chat.find')}
          </button>
        </div>
        {!isDirect && activeChannel?.type === 'VOICE' && (
          <button
            className="rounded-busya px-3 py-2 bg-busya-pink text-busya-night text-xs font-bold"
            onClick={() => (voiceActive ? chat.leaveVoice() : chat.joinVoice(activeChannel.id))}
          >
            {voiceActive ? t(locale, 'chat.leaveVoice') : t(locale, 'chat.joinVoice')}
          </button>
        )}
      </div>

      {search && (
        <div className="border-b border-white/10 p-2 text-xs text-white/60 space-y-1">
          <div>
            {t(locale, 'chat.results', {
              count: isDirect ? chat.directSearchResults.length : chat.searchResults.length,
            })}
          </div>
          <div className="grid gap-1">
            {(isDirect ? chat.directSearchResults : chat.searchResults).slice(0, 5).map((m) => (
              <div key={m.id} className="rounded-busya bg-busya-card/60 px-2 py-1">
                <span className="text-white/70">{m.author?.username ?? 'User'}:</span> {m.content}
              </div>
            ))}
          </div>
        </div>
      )}

      {voiceActive && (
        <div className="border-b border-white/10 p-2 text-xs text-white/60 flex flex-wrap gap-2">
          {chat.voice.participants.map((id) => {
            const member = chat.members.find((m) => m.user?.id === id);
            return (
              <div key={id} className="rounded-full bg-busya-card/70 px-2 py-1">
                {member?.user?.username ?? id.slice(0, 6)}
                <audio id={`voice-audio-${id}`} />
              </div>
            );
          })}
        </div>
      )}

      <div
        ref={listRef}
        className="flex-1 overflow-auto busya-scroll p-4 space-y-3"
        onScroll={handleScroll}
      >
        {isDirect && !chat.activeDirectId && (
          <div className="text-white/60">{t(locale, 'chat.pickDirect')}</div>
        )}
        {!isDirect && !chat.activeChannelId && (
          <div className="text-white/60">{t(locale, 'chat.pickChannel')}</div>
        )}
        {!!(isDirect ? chat.activeDirectId : chat.activeChannelId) && !messages.length && (
          <div className="text-white/60">{t(locale, 'chat.noMessages')}</div>
        )}

        {messages.map((m) => (
          <div key={m.id} className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-busya-card/70 ring-1 ring-white/10 flex items-center justify-center">
              <span>{m.author?.username?.slice(0, 2).toUpperCase() ?? 'U'}</span>
            </div>
            <div className="flex-1 space-y-1">
              <div className="text-sm flex items-center gap-2">
                <span className="font-bold text-busya-sky">{m.author?.username ?? 'User'}</span>
                <span className="text-xs text-white/40">
                  {new Date(m.createdAt).toLocaleTimeString()}
                </span>
                {m.editedAt && <span className="text-[10px] text-white/30">edited</span>}
              </div>
              <div className="text-white/90 whitespace-pre-wrap">{m.content}</div>
              {m.attachments && m.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {m.attachments.map((a) => (
                    <a
                      key={a.id}
                      href={a.url.startsWith('http') ? a.url : `${apiBase}${a.url}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-busya-mint underline"
                    >
                      {a.filename}
                    </a>
                  ))}
                </div>
              )}
              {m.reactions && m.reactions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(
                    m.reactions.reduce<Record<string, number>>((acc, r) => {
                      acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                      return acc;
                    }, {}),
                  ).map(([emoji, count]) => (
                    <button
                      key={emoji}
                      className="text-xs rounded-busya bg-busya-card/70 px-2 py-1 ring-1 ring-white/10"
                      onClick={() =>
                        auth.accessToken &&
                        (m.reactions?.some((r) => r.userId === auth.me?.id && r.emoji === emoji)
                          ? isDirect
                            ? chat.removeDirectReaction(auth.accessToken, m.id, emoji)
                            : chat.removeReaction(auth.accessToken, m.id, emoji)
                          : isDirect
                            ? chat.addDirectReaction(auth.accessToken, m.id, emoji)
                            : chat.addReaction(auth.accessToken, m.id, emoji))
                      }
                    >
                      {emoji} {count}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 text-[11px] text-white/50">
                <button
                  onClick={() => {
                    const emoji = prompt(t(locale, 'chat.reactionPrompt'));
                    if (!emoji || !auth.accessToken) return;
                    if (isDirect) chat.addDirectReaction(auth.accessToken, m.id, emoji);
                    else chat.addReaction(auth.accessToken, m.id, emoji);
                  }}
                >
                  +react
                </button>
                {(m.author?.id === auth.me?.id || canModerate) && (
                  <>
                    <button
                      onClick={() => {
                        const next = prompt(t(locale, 'chat.editPrompt'), m.content);
                        if (!next || !auth.accessToken) return;
                        if (isDirect) chat.editDirect(auth.accessToken, m.id, next);
                        else chat.editMessage(auth.accessToken, m.id, next);
                      }}
                    >
                      edit
                    </button>
                    <button
                      onClick={() => {
                        if (!auth.accessToken) return;
                        if (isDirect) chat.deleteDirect(auth.accessToken, m.id);
                        else chat.deleteMessage(auth.accessToken, m.id);
                      }}
                    >
                      delete
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        <div className="text-xs text-white/40">{typingText}</div>
      </div>

      <div className="border-t border-white/10 p-3 space-y-2">
        {pending.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs">
            {pending.map((p) => (
              <span key={p.id} className="rounded-busya bg-busya-card/70 px-2 py-1">
                {p.filename}
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-busya bg-busya-card/70 px-4 py-3 text-sm outline-none ring-1 ring-white/10 focus:ring-busya-pink/60"
            placeholder={t(locale, 'chat.writeMessage')}
            value={text}
            disabled={!canSend}
            onChange={(e) => {
              setText(e.target.value);
              if (!isDirect && chat.activeChannelId) {
                chat.startTyping(chat.activeChannelId);
              }
            }}
            onKeyDown={async (e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                await handleSend();
              }
            }}
          />
          <label className="rounded-busya px-3 py-3 bg-busya-card/70 text-xs ring-1 ring-white/10 cursor-pointer">
            {t(locale, 'chat.file')}
            <input type="file" multiple hidden disabled={!canSend} onChange={(e) => handleUpload(e.target.files)} />
          </label>
          <button
            className="rounded-busya px-4 py-3 bg-busya-pink text-busya-night font-extrabold shadow-busyaSoft hover:scale-[1.02] transition"
            onClick={handleSend}
            disabled={!canSend}
          >
            {t(locale, 'chat.send')}
          </button>
        </div>
        <div className="text-xs text-white/40">{t(locale, 'chat.enterHint')}</div>
      </div>
    </div>
  );
}
