/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: '#172033',
        lavender: '#8b7cf6',
        lilac: '#eeeaff',
        mint: '#dff8ee',
        peach: '#fff0df',
      },
      boxShadow: {
        soft: '0 18px 50px rgba(47, 43, 86, .10)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
