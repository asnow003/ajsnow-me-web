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
        cream: '#FBF8F3',
        ink: '#1F1D2B',
        playing: { DEFAULT: '#EF9F27', bg: '#FAEEDA', text: '#633806' },
        done: { DEFAULT: '#1D9E75', bg: '#E1F5EE', text: '#085041' },
        danger: '#A32D2D',
      },
      fontFamily: {
        display: ['var(--font-fredoka)', 'ui-rounded', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-8px)' },
          '40%, 80%': { transform: 'translateX(8px)' },
        },
      },
      animation: { shake: 'shake 400ms ease-in-out' },
    },
  },
  plugins: [
    typography,
  ],
};
export default config;
