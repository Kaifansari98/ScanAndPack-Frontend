/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}", "./screens/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: 'class', // Enables dark mode via 'dark' class
  theme: {
    extend: {
      colors: {
        // SAP Light Theme
        sapLight: {
          text: '#000000',
          background: '#ffffff',
          foreground: '#F5F5F5',
          button: '#171717',
          card: '#F5F5F5',
          infoText: '#A0A0A0',
        },
        // SAP Dark Theme
        sapDark: {
          text: '#ffffff',
          background: '#0B0B0B',
          foreground: '#171717',
          button: '#E5E5E5',
          card: '#171717',
          infoText: '#A0A0A0',
        },
      },
      fontFamily: {
        montserrat: ["Montserrat-Regular"],
        "montserrat-medium": ["Montserrat-Medium"],
        "montserrat-semibold": ["Montserrat-SemiBold"],
        "montserrat-bold": ["Montserrat-Bold"],
        "montserrat-black": ["Montserrat-Black"],
      },
      padding: {
        'kpx': '20px',
      },
    },
  },
  plugins: [],
};

// Implementation
// Light theme
// <div className="bg-uwfLight-background text-uwfLight-text" />

// Dark theme
// <div className="bg-uwfDark-background text-uwfDark-text" />
