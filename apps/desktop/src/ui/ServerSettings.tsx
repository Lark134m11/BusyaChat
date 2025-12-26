import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../state/auth';
import { useChat } from '../state/chat';
import { useLocale } from '../state/locale';
import { t } from '../i18n';
import { BusyaButton, BusyaInput } from './Cute';

const ROLES = ['MEMBER', 'MOD', 'ADMIN', 'OWNER'];

export function ServerSettings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const auth = useAuth();
  const chat = useChat();
  const locale = useLocale((s) => s.locale);
  const [name, setName] = useState('');
  const [inviteMaxUses, setInviteMaxUses] = useState('');
  const [inviteExpiresAt, setInviteExpiresAt] = useState('');

  const server = useMemo(() => chat.servers.find((s) => s.id === chat.activeServerId), [chat.activeServerId, chat.servers]);
  const role = server?.role ?? 'MEMBER';
  const canRename = role === 'OWNER' || role === 'ADMIN';
  const canManageInvites = role === 'OWNER' || role === 'ADMIN' || role === 'MOD';
  const canListInvites = role === 'OWNER' || role === 'ADMIN';
  const canManageRoles = role === 'OWNER' || role === 'ADMIN';
  const canModerate = role === 'OWNER' || role === 'ADMIN' || role === 'MOD';
  const canDelete = role === 'OWNER';

  useEffect(() => {
    if (!open) return;
    setName(server?.name ?? '');
    if (auth.accessToken && chat.activeServerId) {
      chat.loadMembers(auth.accessToken, chat.activeServerId);
      if (canListInvites) chat.loadInvites(auth.accessToken, chat.activeServerId);
    }
  }, [open, auth.accessToken, chat.activeServerId, canListInvites, server?.name]);

  if (!server) return null;

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="w-full max-w-3xl rounded-busya bg-busya-card/90 p-6 ring-1 ring-white/10 shadow-busyaSoft">
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg font-bold">{t(locale, 'settings.title')}</div>
          <button className="text-white/60 hover:text-white" onClick={onClose}>
            {t(locale, 'settings.close')}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <div className="text-xs text-white/50 mb-1">{t(locale, 'settings.renameTitle')}</div>
              <BusyaInput
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t(locale, 'settings.serverName')}
              />
              <BusyaButton
                className="mt-2 w-full"
                disabled={!canRename || !auth.accessToken || !chat.activeServerId}
                onClick={() => {
                  if (!auth.accessToken || !chat.activeServerId) return;
                  if (!name.trim()) return;
                  chat.renameServer(auth.accessToken, chat.activeServerId, name.trim());
                }}
              >
                {t(locale, 'settings.saveName')}
              </BusyaButton>
            </div>

            {canDelete && (
              <div>
                <div className="text-xs text-white/50 mb-1">{t(locale, 'settings.danger')}</div>
                <BusyaButton
                  className="w-full"
                  onClick={() => {
                    if (!auth.accessToken || !chat.activeServerId) return;
                    const ok = window.confirm(t(locale, 'settings.deleteConfirm'));
                    if (!ok) return;
                    chat.deleteServer(auth.accessToken, chat.activeServerId);
                    onClose();
                  }}
                >
                  {t(locale, 'settings.deleteServer')}
                </BusyaButton>
              </div>
            )}

            {canManageInvites && (
              <div>
                <div className="text-xs text-white/50 mb-1">{t(locale, 'settings.invites')}</div>
                <div className="grid grid-cols-[1fr_1fr] gap-2">
                  <input
                    className="rounded-busya bg-busya-card/70 px-3 py-2 text-sm ring-1 ring-white/10"
                    placeholder={t(locale, 'settings.inviteMax')}
                    value={inviteMaxUses}
                    onChange={(e) => setInviteMaxUses(e.target.value)}
                  />
                  <input
                    className="rounded-busya bg-busya-card/70 px-3 py-2 text-sm ring-1 ring-white/10"
                    placeholder={t(locale, 'settings.inviteExpires')}
                    value={inviteExpiresAt}
                    onChange={(e) => setInviteExpiresAt(e.target.value)}
                  />
                </div>
                <BusyaButton
                  className="mt-2 w-full"
                  disabled={!auth.accessToken || !chat.activeServerId}
                  onClick={async () => {
                    if (!auth.accessToken || !chat.activeServerId) return;
                    const maxUses = inviteMaxUses ? Number(inviteMaxUses) : undefined;
                    const expiresAt = inviteExpiresAt ? new Date(inviteExpiresAt).toISOString() : undefined;
                    const invite = await chat.createInvite(auth.accessToken, chat.activeServerId, maxUses, expiresAt);
                    setInviteMaxUses('');
                    setInviteExpiresAt('');
                    if (!canListInvites && invite?.code) {
                      window.alert(t(locale, 'settings.inviteAlert', { code: invite.code }));
                    }
                  }}
                >
                  {t(locale, 'settings.createInvite')}
                </BusyaButton>
                {canListInvites && (
                  <div className="mt-3 space-y-2">
                    {chat.invites.map((inv) => (
                      <div
                        key={inv.code}
                        className="flex items-center justify-between rounded-busya bg-busya-card/60 px-3 py-2 ring-1 ring-white/10"
                      >
                        <div className="text-sm">
                          {inv.code}
                          <span className="text-[11px] text-white/50 ml-2">
                            {inv.uses}/{inv.maxUses ?? t(locale, 'settings.unlimited')}
                          </span>
                        </div>
                        <button
                          className="text-xs text-white/60 hover:text-white"
                          onClick={() => auth.accessToken && chat.revokeInvite(auth.accessToken, inv.code)}
                        >
                          {t(locale, 'settings.revoke')}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <div className="text-xs text-white/50 mb-1">{t(locale, 'settings.members')}</div>
            <div className="space-y-2 max-h-[420px] overflow-auto busya-scroll pr-2">
              {chat.members.map((m) => (
                <div
                  key={m.id}
                  className="rounded-busya bg-busya-card/60 px-3 py-2 ring-1 ring-white/10 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm">{m.user?.username ?? 'User'}</div>
                    <div className="text-[10px] text-white/50">{m.user?.status ?? 'OFFLINE'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      disabled={!canManageRoles || m.role === 'OWNER'}
                      className="flex-1 rounded-busya bg-busya-card/70 px-2 py-1 text-xs ring-1 ring-white/10"
                      value={m.role}
                      onChange={(e) =>
                        auth.accessToken &&
                        chat.activeServerId &&
                        chat.updateMemberRole(auth.accessToken, chat.activeServerId, m.user.id, e.target.value)
                      }
                    >
                      {(m.role === 'OWNER' ? ['OWNER'] : ROLES.filter((r) => r !== 'OWNER')).map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                    {canModerate && (
                      <>
                        <button
                          className="text-xs text-white/60 hover:text-white"
                          onClick={() =>
                            auth.accessToken &&
                            chat.activeServerId &&
                            chat.kickMember(auth.accessToken, chat.activeServerId, m.user.id)
                          }
                        >
                          {t(locale, 'settings.kick')}
                        </button>
                        <button
                          className="text-xs text-white/60 hover:text-white"
                          onClick={() =>
                            auth.accessToken &&
                            chat.activeServerId &&
                            chat.banMember(auth.accessToken, chat.activeServerId, m.user.id)
                          }
                        >
                          {t(locale, 'settings.ban')}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
