import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: {
        'xs': '480px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
      fontSize: {
        'responsive-xs': 'clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem)',
        'responsive-sm': 'clamp(0.875rem, 0.8rem + 0.4vw, 1rem)',
        'responsive-base': 'clamp(1rem, 0.9rem + 0.5vw, 1.125rem)',
        'responsive-lg': 'clamp(1.125rem, 1rem + 0.625vw, 1.25rem)',
        'responsive-xl': 'clamp(1.25rem, 1.1rem + 0.75vw, 1.5rem)',
        'responsive-2xl': 'clamp(1.5rem, 1.3rem + 1vw, 2rem)',
        'responsive-3xl': 'clamp(1.875rem, 1.5rem + 1.875vw, 2.5rem)',
      },
      spacing: {
        'responsive-xs': 'clamp(0.5rem, 0.4rem + 0.5vw, 0.75rem)',
        'responsive-sm': 'clamp(0.75rem, 0.6rem + 0.75vw, 1rem)',
        'responsive-md': 'clamp(1rem, 0.8rem + 1vw, 1.5rem)',
        'responsive-lg': 'clamp(1.5rem, 1.2rem + 1.5vw, 2rem)',
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' }
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'scroll': {
          '0%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(5px)' },
          '100%': { transform: 'translateY(0)' }
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '0.8' }
        },
        'slide-in-left': {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' }
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' }
        }
      },
      animation: {
        shimmer: 'shimmer 2s infinite',
        'fade-in': 'fade-in 1s ease-out',
        'fade-in-up': 'fade-in-up 1s ease-out',
        'scroll': 'scroll 1.5s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'slide-in-left': 'slide-in-left 0.5s ease-out',
        'slide-in-right': 'slide-in-right 0.5s ease-out'
      }
    },
  },
  plugins: [],
};
export default config;
