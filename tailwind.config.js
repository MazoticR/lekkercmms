/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
   theme: {
    extend: {
      colors: {
        primary: {
          light: '#a78bfa',
          DEFAULT: '#8b5cf6',
          dark: '#7c3aed',
        },
        secondary: {
          light: '#f0abfc',
          DEFAULT: '#d946ef',
          dark: '#c026d3',
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};

