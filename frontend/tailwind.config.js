/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark hunter green theme color
        park: '#254117',
        trail: '#8b7355',
      }
    },
  },
  plugins: [],
}
