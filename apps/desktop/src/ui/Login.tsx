import React, { useState } from 'react';
import { useAuth } from '../state/auth';
import { BusyaBadge, BusyaButton, BusyaInput } from './Cute';

export function Login({ onSwitch }: { onSwitch: () => void }) {
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="w-full max-w-md rounded-busya bg-busya-card/60 p-6 shadow-busya ring-1 ring-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xl font-extrabold text-white">BusyaChat</div>
          <BusyaBadge text="enter gently" />
        </div>

        <div className="space-y-3">
          <BusyaInput value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />
          <BusyaInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
            type="password"
          />

          {auth.error && <div className="text-sm text-busya-pink">{auth.error}</div>}

          <BusyaButton disabled={auth.loading} onClick={() => auth.login(email, password)} className="w-full">
            {auth.loading ? 'signing in...' : 'Sign in'}
          </BusyaButton>

          <button className="text-sm text-white/60 hover:text-white" onClick={onSwitch}>
            No account? Create one
          </button>
        </div>
      </div>
    </div>
  );
}
