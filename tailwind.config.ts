import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        reader: {
          bg: '#0a0a0a',
          panel: '#171717',
          text: '#e5e5e5',
          muted: '#a3a3a3',
          accent: '#3b82f6'
        }
      }
    }
  },
  plugins: []
} satisfies Config
