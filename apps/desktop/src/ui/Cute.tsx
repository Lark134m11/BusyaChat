import React from 'react';

export function BusyaBadge({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-busya-card/70 px-3 py-1 text-xs text-white/80 shadow-busyaSoft">
      <span className="text-busya-pink">🐾</span>
      <span>{text}</span>
    </span>
  );
}

export function BusyaButton(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { cute?: boolean }) {
  const { className, cute = true, ...rest } = props;
  return (
    <button
      {...rest}
      className={[
        'rounded-busya px-4 py-2 font-semibold transition',
        cute ? 'bg-busya-pink text-busya-night shadow-busyaSoft hover:scale-[1.02]' : '',
        'disabled:opacity-50 disabled:hover:scale-100',
        className ?? '',
      ].join(' ')}
    />
  );
}

export function BusyaInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return (
    <input
      {...rest}
      className={[
        'w-full rounded-busya bg-busya-card/70 px-4 py-3 text-white placeholder:text-white/40 outline-none ring-1 ring-white/10 focus:ring-busya-pink/60',
        className ?? '',
      ].join(' ')}
    />
  );
}
