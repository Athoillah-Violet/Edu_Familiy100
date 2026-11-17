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
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        },
        team: {
          blue: '#3b82f6',
          red: '#ef4444',
          green: '#10b981',
          orange: '#f97316',
        },
      },
      boxShadow: {
        subtle: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
      },
    },
  },
  plugins: [],
};
