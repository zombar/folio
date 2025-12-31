/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Custom color palette
        surface: {
          DEFAULT: '#1e293b', // slate-800
          dark: '#0f172a',    // slate-900
        },
        accent: {
          DEFAULT: '#8b5cf6', // violet-500
          dark: '#7c3aed',    // violet-600
        },
      },
    },
  },
  plugins: [],
}
