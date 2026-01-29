/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        semadata: {
          green: '#489c8c',
          dark: '#367a6d',
        }
      }
    },
  },
  plugins: [],
}