import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#534AB7', dark: '#3C3489', deep: '#26215C', light: '#AFA9EC', pale: '#EEEDFE' },
        // Page, text and card colors come from CSS variables (globals.css), so flashcards can switch to dark.
        cream: 'rgb(var(--c-cream) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        playing: { DEFAULT: '#EF9F27', bg: '#FAEEDA', text: '#633806' },
        done: { DEFAULT: '#1D9E75', bg: '#E1F5EE', text: '#085041' },
        danger: '#A32D2D',
        // "Ready" action buttons. A true green kept apart from Golf's teal so it never reads as a game color.
        go: { DEFAULT: '#2E7D32', dark: '#1B5E20' },
        // The current app's accent, set as --accent on its layout. Shared screens (sign-in) use it.
        accent: 'var(--accent, #534AB7)',
        // Flashcards app.
        fc: { DEFAULT: '#0F766E', dark: '#115E59', deep: 'rgb(var(--c-fc-deep) / <alpha-value>)', pale: 'rgb(var(--c-fc-pale) / <alpha-value>)' },
      },
      fontFamily: {
        // Each app sets --font-display on its layout: Fredoka for the games, Fraunces for flashcards.
        display: ['var(--font-display)', 'ui-rounded', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-8px)' },
          '40%, 80%': { transform: 'translateX(8px)' },
        },
        'card-in': {
          from: { opacity: '0', transform: 'translateY(12px) scale(0.98)' },
          to: { opacity: '1', transform: 'none' },
        },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'sheet-in': { from: { transform: 'translateY(24px)', opacity: '0' }, to: { transform: 'none', opacity: '1' } },
      },
      animation: {
        shake: 'shake 400ms ease-in-out',
        'card-in': 'card-in 280ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        'fade-in': 'fade-in 160ms ease-out',
        'sheet-in': 'sheet-in 220ms cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
    },
  },
  plugins: [
    typography,
  ],
};
export default config;
