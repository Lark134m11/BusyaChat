import React, { useMemo } from 'react';
import { useChat } from '../state/chat';
import { useLocale } from '../state/locale';
import { t } from '../i18n';

const ROLE_ORDER = ['OWNER', 'ADMIN', 'MOD', 'MEMBER'];

export function Members() {
  const chat = useChat();
  const locale = useLocale((s) => s.locale);

  const grouped = useMemo(() => {
    const groups: Record<string, any[]> = {};
    ROLE_ORDER.forEach((r) => (groups[r] = []));
    chat.members.forEach((m) => {
      const role = m.role ?? 'MEMBER';
      if (!groups[role]) groups[role] = [];
      groups[role].push(m);
    });
    return groups;
  }, [chat.members]);

  if (chat.view !== 'server') {
    return (
      <div className="border-l border-white/10 p-3 text-sm text-white/60">
        <div className="font-bold mb-2">{t(locale, 'members.directInfoTitle')}</div>
        <div className="text-white/50">{t(locale, 'members.directInfoEmpty')}</div>
      </div>
    );
  }

  return (
    <div className="border-l border-white/10 p-3 overflow-auto busya-scroll">
      <div className="font-bold mb-3">{t(locale, 'members.title')}</div>
      {ROLE_ORDER.map((role) => {
        const list = grouped[role] || [];
        if (!list.length) return null;
        return (
          <div key={role} className="mb-3">
            <div className="text-xs text-white/40 mb-1">{role}</div>
            <div className="space-y-1">
              {list.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-busya bg-busya-card/50 px-2 py-2 ring-1 ring-white/10"
                >
                  <div>
                    <div className="text-sm">{m.user?.username ?? 'User'}</div>
                    <div className="text-[11px] text-white/50">
                      {chat.presence[m.user?.id] ?? m.user?.status ?? 'OFFLINE'}
                    </div>
                  </div>
                  <span className="text-[10px] text-white/40">{role}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
