import React, { useState } from 'react';
import { useAuth } from '../state/auth';
import { BusyaBadge, BusyaButton, BusyaInput } from './Cute';

export function Register({ onSwitch }: { onSwitch: () => void }) {
  const auth = useAuth();
  const [username, setUsername] = useState('Busya');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="w-full max-w-md rounded-busya bg-busya-card/60 p-6 shadow-busya ring-1 ring-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xl font-extrabold text-white">BusyaChat</div>
          <BusyaBadge text="register softly" />
        </div>

        <div className="space-y-3">
          <BusyaInput value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" />
          <BusyaInput value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />
          <BusyaInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password (8+)"
            type="password"
          />

          {auth.error && <div className="text-sm text-busya-pink">{auth.error}</div>}

          <BusyaButton
            disabled={auth.loading}
            onClick={() => auth.register(email, password, username)}
            className="w-full"
          >
            {auth.loading ? 'creating account...' : 'Create account'}
          </BusyaButton>

          <button className="text-sm text-white/60 hover:text-white" onClick={onSwitch}>
            Have an account? Sign in
          </button>
        </div>
      </div>
    </div>
  );
}
