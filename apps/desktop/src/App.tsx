import React, { useEffect, useState } from 'react';
import { useAuth } from './state/auth';
import { useChat } from './state/chat';
import { Layout } from './ui/Layout';
import { Login } from './ui/Login';
import { Register } from './ui/Register';

export function App() {
  const auth = useAuth();
  const chat = useChat();
  const [mode, setMode] = useState<'login' | 'register'>('login');

  useEffect(() => {
    auth.initMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
