import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bux: {
          green: '#1E4D2B',
          'green-dark': '#143620',
          'green-light': '#2D6B3D',
          yellow: '#FFD400',
          'yellow-dark': '#E6BF00',
          cream: '#FFFDF5',
        },
      },
      fontFamily: {
        sans: ['var(--font-app)', 'system-ui', 'sans-serif'],
        display: ['var(--font-oswald)', 'var(--font-app)', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 20px -4px rgba(20, 54, 32, 0.18)',
        btn: '0 6px 0 0 #E6BF00',
        'btn-green': '0 6px 0 0 #143620',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pop': {
          '0%': { transform: 'scale(0.96)' },
          '60%': { transform: 'scale(1.02)' },
          '100%': { transform: 'scale(1)' },
        },
        'grow': {
          '0%': { transform: 'scaleX(0)' },
          '100%': { transform: 'scaleX(1)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease-out both',
        'pop': 'pop 0.25s ease-out both',
        'grow': 'grow 1.5s ease-out forwards',
      },
    },
  },
  plugins: [],
};

export default config;
