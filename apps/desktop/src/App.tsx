import React, { useEffect, useState } from 'react';
import { useAuth } from './state/auth';
import { useChat } from './state/chat';
import { useTheme } from './state/theme';
import { Layout } from './ui/Layout';
import { Login } from './ui/Login';
import { Register } from './ui/Register';

export function App() {
  const auth = useAuth();
  const chat = useChat();
  const refreshDevices = useChat((s) => s.refreshDevices);
  const theme = useTheme((s) => s.theme);
  const [mode, setMode] = useState<'login' | 'register'>('login');

  useEffect(() => {
    auth.initMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    refreshDevices();
    if (!navigator.mediaDevices?.addEventListener) return;
    const handler = () => refreshDevices();
    navigator.mediaDevices.addEventListener('devicechange', handler);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handler);
    };
  }, [refreshDevices]);

  useEffect(() => {
    if (!auth.accessToken) {
      chat.disconnectWs();
      return;
    }
    if (auth.me?.id) {
      chat.connectWs(auth.accessToken, auth.me.id);
    }
    chat.loadServers(auth.accessToken);
    chat.loadDirectThreads(auth.accessToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.accessToken, auth.me?.id]);

  if (!auth.accessToken) {
    return mode === 'login' ? (
      <Login onSwitch={() => setMode('register')} />
    ) : (
      <Register onSwitch={() => setMode('login')} />
    );
  }

  return <Layout />;
}
