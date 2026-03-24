/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: '#121212',
        charcoal: '#1E1E1E',
        'electric-purple': '#7C3AED',
        'spotify-green': '#1DB954',
        'discord-blue': '#5865F2',
        'accent-violet': '#8B5CF6',
      },
      fontFamily: {
        display: ['Chakra Petch', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
        body: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
