/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: "#0B0F19",
        cardBg: "rgba(30, 41, 59, 0.7)",
        accentCyan: "#06B6D4",
        accentBlue: "#3B82F6",
        hazardYellow: "#F59E0B",
        hazardOrange: "#F97316",
        hazardRed: "#EF4444",
        hazardSevere: "#991B1B",
        safeGreen: "#10B981"
      },
      backdropBlur: {
        xs: "2px",
      }
    },
  },
  plugins: [],
}
