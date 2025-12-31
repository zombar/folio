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
        // Ink/charcoal color palette for artist's easel aesthetic
        ink: {
          DEFAULT: '#1f2937', // gray-800
          dark: '#111827',    // gray-900
          light: '#374151',   // gray-700
        },
        canvas: {
          DEFAULT: '#f3f4f6', // gray-100
          light: '#f9fafb',   // gray-50
          dark: '#e5e7eb',    // gray-200
        },
      },
    },
  },
  plugins: [],
}
