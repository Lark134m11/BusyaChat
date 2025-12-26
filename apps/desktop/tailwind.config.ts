import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        busya: {
          pink: 'rgb(var(--busya-pink) / <alpha-value>)',
          cream: 'rgb(var(--busya-cream) / <alpha-value>)',
          cocoa: 'rgb(var(--busya-cocoa) / <alpha-value>)',
          sky: 'rgb(var(--busya-sky) / <alpha-value>)',
          mint: 'rgb(var(--busya-mint) / <alpha-value>)',
          night: 'rgb(var(--busya-night) / <alpha-value>)',
          card: 'rgb(var(--busya-card) / <alpha-value>)'
        }
      },
      borderRadius: {
        busya: '16px'
      },
      boxShadow: {
        busya: '0 10px 30px rgba(0,0,0,0.35)',
        busyaSoft: '0 8px 20px rgba(0,0,0,0.22)'
      }
    }
  },
  plugins: []
} satisfies Config;
