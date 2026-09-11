/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          900: "#1b1240",
          800: "#241a52",
          700: "#2e2263",
        },
        vaquita: {
          green: "#2e9e5b",
          greenDark: "#22a559",
          cream: "#faf7f2",
        },
      },
      fontFamily: {
        display: ["'Poppins'", "sans-serif"],
      },
    },
  },
  plugins: [],
};
