/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        park: '#2d5016',
        trail: '#8b7355',
      }
    },
  },
  plugins: [],
}
