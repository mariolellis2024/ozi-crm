/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          DEFAULT: '#1A1D21',
          lighter: '#22262B',
          card: '#2A2F35'
        },
        teal: {
          accent: '#2CD3C7'
        },
        yellow: {
          400: '#FBBF24',
          500: '#F59E0B'
        },
        orange: {
          400: '#FB923C',
          500: '#F97316'
        },
        blue: {
          400: '#60A5FA',
          500: '#3B82F6'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif']
      }
    },
  },
  plugins: [],
};