import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1e3a5f',
          hover: '#152943',
          light: '#2c5282',
          dark: '#142740',
          50: '#f0f5fa',
          100: '#e0ebf5',
          200: '#c2d7eb',
        },
        secondary: {
          DEFAULT: '#2d9d5f',
          hover: '#227b4a',
          light: '#3db874',
          50: '#edfbf3',
          100: '#d6f6e4',
        },
        warning: {
          DEFAULT: '#d97706',
          hover: '#b45309',
          50: '#fffbeb',
          100: '#fef3c7',
        },
        danger: {
          DEFAULT: '#dc2626',
          hover: '#b91c1c',
          50: '#fef2f2',
          100: '#fee2e2',
        },
        ncct: {
          blue: '#1e3a5f',
          green: '#2d9d5f',
          amber: '#d97706',
          red: '#dc2626',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
