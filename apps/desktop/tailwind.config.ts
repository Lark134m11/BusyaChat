import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        busya: {
          pink: '#FFB6C9',
          cream: '#FFF3E6',
          cocoa: '#5B3A2E',
          sky: '#BFE7FF',
          mint: '#BFF7D2',
          night: '#1E1F2A',
          card: '#25263A'
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
