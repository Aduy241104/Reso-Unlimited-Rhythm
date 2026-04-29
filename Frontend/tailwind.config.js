/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["SpotifyMixUI", "sans-serif"],
        title: ["SpotifyMixUITitle", "SpotifyMixUI", "sans-serif"],
      },
    },
  },
  plugins: [],
}
