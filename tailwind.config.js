/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./setup.html",
    "./game.html",
    "./result.html",
    "./admin/**/*.html",
    "./src/**/*.{js,html}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        darkbg: '#080e1e',
        darksurface: '#0f1a36',
        darksurfacecard: '#132247',
        darkborder: '#1e2f5c',
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        accent: {
          orange: '#f97316',
          orangeHover: '#ea580c',
          blue: '#2563eb',
          blueHover: '#1d4ed8',
        },
        team: {
          blue: '#3b82f6',
          red: '#ef4444',
          green: '#10b981',
          orange: '#f97316',
        },
      },
      boxShadow: {
        subtle: '0 1px 3px 0 rgba(0, 0, 0, 0.2), 0 1px 2px 0 rgba(0, 0, 0, 0.1)',
        glowBlue: '0 0 20px -3px rgba(37, 99, 235, 0.35)',
        glowOrange: '0 0 20px -3px rgba(249, 115, 22, 0.35)',
      },
    },
  },
  plugins: [],
};
