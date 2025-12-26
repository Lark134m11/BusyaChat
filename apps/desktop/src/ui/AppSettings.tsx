import React, { useEffect } from 'react';
import { useLocale } from '../state/locale';
import { useTheme } from '../state/theme';
import type { Theme } from '../state/theme';
import { useChat } from '../state/chat';
import { t } from '../i18n';
import { LanguageSwitch } from './LanguageSwitch';

export function AppSettings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const locale = useLocale((s) => s.locale);
  const setTheme = useTheme((s) => s.setTheme);
  const theme = useTheme((s) => s.theme);
  const chat = useChat();

  useEffect(() => {
    if (!open) return;
    chat.refreshDevices();
  }, [open, chat]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="w-full max-w-3xl rounded-busya bg-busya-card/90 p-6 ring-1 ring-white/10 shadow-busyaSoft">
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg font-bold">{t(locale, 'settings.appTitle')}</div>
          <button className="text-white/60 hover:text-white" onClick={onClose}>
            {t(locale, 'settings.close')}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <div className="text-xs text-white/50 mb-1">{t(locale, 'settings.appearance')}</div>
              <div className="rounded-busya bg-busya-card/60 ring-1 ring-white/10 p-3 space-y-3">
                <label className="text-xs text-white/50">{t(locale, 'settings.theme')}</label>
                <select
                  className="w-full rounded-busya bg-busya-card/70 px-3 py-2 text-sm text-white ring-1 ring-white/10"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as Theme)}
                >
                  <option value="midnight">{t(locale, 'theme.midnight')}</option>
                  <option value="dawn">{t(locale, 'theme.dawn')}</option>
                  <option value="pulse">{t(locale, 'theme.pulse')}</option>
                </select>
                <label className="text-xs text-white/50">{t(locale, 'settings.language')}</label>
                <LanguageSwitch />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="text-xs text-white/50 mb-1">{t(locale, 'settings.voice')}</div>
              <div className="rounded-busya bg-busya-card/60 ring-1 ring-white/10 p-3 space-y-3">
                <button
                  className="rounded-busya px-3 py-2 text-xs bg-busya-pink text-busya-night font-bold"
                  onClick={() => chat.requestMicAccess()}
                >
                  {t(locale, 'settings.requestMic')}
                </button>
                {!chat.devices.hasPermission && (
                  <div className="text-xs text-white/50">{t(locale, 'settings.permissionHint')}</div>
                )}
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-busya px-3 py-2 text-xs bg-busya-card/80 ring-1 ring-white/10"
                    onClick={() => chat.toggleMute()}
                  >
                    {chat.voice.muted ? t(locale, 'settings.unmute') : t(locale, 'settings.mute')}
                  </button>
                  <button
                    className="rounded-busya px-3 py-2 text-xs bg-busya-card/80 ring-1 ring-white/10"
                    onClick={() => chat.toggleDeafen()}
                  >
                    {chat.voice.deafened ? t(locale, 'settings.undeafen') : t(locale, 'settings.deafen')}
                  </button>
                </div>
                <div className="flex items-center justify-between text-xs text-white/60">
                  <span>{t(locale, 'settings.micStatus')}</span>
                  <span>{chat.voice.muted ? t(locale, 'settings.micMuted') : t(locale, 'settings.micLive')}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-white/60">
                  <span>{t(locale, 'settings.deafenStatus')}</span>
                  <span>{chat.voice.deafened ? t(locale, 'settings.deafenOn') : t(locale, 'settings.deafenOff')}</span>
                </div>
                <label className="text-xs text-white/50">{t(locale, 'settings.inputDevice')}</label>
                <select
                  className="w-full rounded-busya bg-busya-card/70 px-3 py-2 text-sm text-white ring-1 ring-white/10"
                  value={chat.voice.inputDeviceId ?? ''}
                  onChange={(e) => chat.setVoiceInput(e.target.value || null)}
                >
                  <option value="">
                    {chat.devices.inputs.length
                      ? t(locale, 'settings.defaultDevice')
                      : t(locale, 'settings.noDevices')}
                  </option>
                  {chat.devices.inputs.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Mic ${d.deviceId.slice(0, 6)}`}
                    </option>
                  ))}
                </select>

                <label className="text-xs text-white/50">{t(locale, 'settings.outputDevice')}</label>
                <select
                  className="w-full rounded-busya bg-busya-card/70 px-3 py-2 text-sm text-white ring-1 ring-white/10"
                  value={chat.voice.outputDeviceId ?? ''}
                  onChange={(e) => chat.setVoiceOutput(e.target.value || null)}
                >
                  <option value="">
                    {chat.devices.outputs.length
                      ? t(locale, 'settings.defaultDevice')
                      : t(locale, 'settings.noDevices')}
                  </option>
                  {chat.devices.outputs.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Out ${d.deviceId.slice(0, 6)}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
