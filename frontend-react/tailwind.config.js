/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 设计系统：Progress teal + achievement orange
        primary: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        accent: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
        },
        ink: '#0f172a',
        muted: '#64748b',
        surface: '#ffffff',
        bg: '#f0fdfa',
      },
      fontFamily: {
        display: ['Fredoka', 'Noto Sans SC', 'sans-serif'],
        sans: ['Nunito', 'Noto Sans SC', 'sans-serif'],
      },
      borderRadius: {
        clay: '20px',
        claySm: '14px',
      },
      boxShadow: {
        clay: '4px 4px 8px rgba(13, 148, 136, 0.08), inset -2px -2px 8px rgba(255, 255, 255, 0.9)',
        'clay-hover': '6px 6px 14px rgba(13, 148, 136, 0.14), inset -2px -2px 10px rgba(255, 255, 255, 0.95), 0 12px 24px rgba(13, 148, 136, 0.12)',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.45s ease-out both',
        'pop-in': 'pop-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both',
      },
    },
  },
  plugins: [],
}
