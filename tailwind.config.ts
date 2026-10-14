import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef7f3",
          100: "#d6ece1",
          200: "#aed9c4",
          300: "#7cbfa1",
          400: "#4a9f7c",
          500: "#2f8462",
          600: "#22694e",
          700: "#1c5440",
          800: "#184335",
          900: "#14372d",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
