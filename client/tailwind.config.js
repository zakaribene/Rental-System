/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Manrope', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#f2f1ff',
          100: '#e6e4ff',
          200: '#d0ccff',
          300: '#aea5ff',
          400: '#8b7bff',
          500: '#6c4fff',
          600: '#5a34f5',
          700: '#4b26d9',
          800: '#3e21af',
          900: '#341f8a',
          950: '#1f1160',
        },
        ink: {
          50: '#f6f7f9',
          100: '#eceef2',
          200: '#d5d9e1',
          300: '#b0b7c4',
          400: '#8690a3',
          500: '#677185',
          600: '#525b6e',
          700: '#434a5a',
          800: '#2d3140',
          900: '#1a1c26',
          950: '#0f1017',
        },
        success: { 50: '#ecfdf5', 500: '#10b981', 600: '#059669', 700: '#047857' },
        danger: { 50: '#fef2f2', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c' },
        warning: { 50: '#fffbeb', 500: '#f59e0b', 600: '#d97706', 700: '#b45309' },
        info: { 50: '#eff6ff', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8' },
      },
      boxShadow: {
        soft: '0 1px 2px 0 rgb(15 16 23 / 0.04), 0 1px 3px 0 rgb(15 16 23 / 0.06)',
        card: '0 1px 3px 0 rgb(15 16 23 / 0.05), 0 8px 24px -8px rgb(15 16 23 / 0.08)',
        pop: '0 20px 40px -12px rgb(76 45 255 / 0.25)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0, transform: 'translateY(4px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        pulseSoft: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.55 } },
        wiggle: {
          '0%,100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-12deg)' },
          '75%': { transform: 'rotate(12deg)' },
        },
        toastIn: { from: { opacity: 0, transform: 'translateX(28px) scale(0.96)' }, to: { opacity: 1, transform: 'translateX(0) scale(1)' } },
        toastOut: { from: { opacity: 1, transform: 'translateX(0) scale(1)' }, to: { opacity: 0, transform: 'translateX(28px) scale(0.96)' } },
      },
      animation: {
        fadeIn: 'fadeIn .35s ease-out',
        pulseSoft: 'pulseSoft 2s ease-in-out infinite',
        toastIn: 'toastIn .32s cubic-bezier(0.16,1,0.3,1)',
        toastOut: 'toastOut .25s ease-in forwards',
      },
    },
  },
  plugins: [],
}
