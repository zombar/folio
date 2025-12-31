/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        pacifico: ['Pacifico', 'cursive'],
      },
      colors: {
        // Pure grayscale palette for artist's easel aesthetic
        ink: {
          DEFAULT: '#262626', // neutral-800
          dark: '#171717',    // neutral-900
          light: '#404040',   // neutral-700
        },
        canvas: {
          DEFAULT: '#f5f5f5', // neutral-100
          light: '#fafafa',   // neutral-50
          dark: '#e5e5e5',    // neutral-200
        },
      },
    },
  },
  plugins: [],
}
