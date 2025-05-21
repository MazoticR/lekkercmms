/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#EAF2CE', // Lightest green
        foreground: '#0D0D0D', // Dark text
        primary: {
          light: '#DFF2B6',   // Light green
          DEFAULT: '#88BF50', // Primary green
          dark: '#76A646',    // Dark green
        },
        accent: '#0D0D0D',    // For contrast
        card: {
          bg: '#FFFFFF',
          border: '#DFF2B6',
        },
        sidebar: {
          DEFAULT: '#76A646',    // Dark green
          light: '#88BF50',      // Primary green
          lighter: '#DFF2B6',    // Light green
          text: '#FFFFFF',       // White text
          secondary: '#EAF2CE',  // Lightest green
        }
      },
      backgroundColor: {
        DEFAULT: '#EAF2CE', // Lightest green background
      },
      textColor: {
        DEFAULT: '#0D0D0D', // Dark text
      },
      screens: {
        'xs': '480px',
        'sidebar-collapse': '768px',
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