/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#06101e',
          900: '#0d1f38',
          800: '#122240',
          700: '#1a3054',
          600: '#234168',
        },
        gold: {
          300: '#f5cc7f',
          400: '#f0b84a',
          500: '#e8a428',
          600: '#d4911a',
        },
        teal: {
          400: '#2ee8c7',
          500: '#00c9a7',
          600: '#00b094',
        },
        crimson: {
          400: '#f07082',
          500: '#e8455a',
          600: '#d43348',
        },
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['Lora', 'Georgia', 'serif'],
        mono: ['"IBM Plex Mono"', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}
