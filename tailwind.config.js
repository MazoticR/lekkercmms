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
        sidebar: {
          DEFAULT: '#6d28d9',
          hover: '#7c3aed',
          active: '#5b21b6',
          text: '#ffffff',
        },
      },
      screens: {
        'xs': '480px', // Extra small screens
        'sidebar-collapse': '768px', // Breakpoint for sidebar collapse
      },
      transitionProperty: {
        'width': 'width',
        'spacing': 'margin, padding',
        'sidebar': 'width, transform, margin',
      },
      boxShadow: {
        'sidebar': '4px 0 6px -1px rgba(0, 0, 0, 0.1)',
      },
      spacing: {
        'sidebar-collapsed': '5rem',
        'sidebar-expanded': '16rem',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    function({ addUtilities }) {
      const newUtilities = {
        '.no-scrollbar::-webkit-scrollbar': {
          display: 'none',
        },
        '.no-scrollbar': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
        },
        '.sidebar-transition': {
          transition: 'all 0.3s ease-in-out',
        },
      }
      addUtilities(newUtilities)
    }
  ],
}