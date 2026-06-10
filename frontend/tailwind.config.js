/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Source Serif 4', 'Georgia', 'serif'],
        body: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        accent: {
          300: '#f5e2b4',  // synapse-tertiary-300
          400: '#f3da9c',  // synapse-tertiary-400
          500: '#f1d285',  // synapse-tertiary-500
          600: '#f3cd6f',  // synapse-tertiary-600
          700: '#f7c957',  // synapse-tertiary-700
          800: '#fdc846',  // synapse-tertiary-800
          900: '#ffbe1b',  // synapse-tertiary-900
        },
        brand: {
          50:  '#e8f3f9',
          100: '#aed3e4',
          200: '#5fbbd9',
          300: '#2f99ca',
          400: '#1b7eab',
          500: '#166e97',
          600: '#125e81',  // synapse-primary-action-color
          700: '#0c5272',
          800: '#074663',
          900: '#002637',  // synapse-primary-900
        },
      },
    },
  },
  plugins: [],
};
