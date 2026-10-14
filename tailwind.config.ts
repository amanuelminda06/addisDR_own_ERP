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
          50: "#e0f9ff",
          100: "#b3f0f5",
          200: "#80e6ec",
          300: "#4dd9e0",
          400: "#1bc4cd",
          500: "#01b4a3",
          600: "#009187",
          700: "#007268",
          800: "#005a52",
          900: "#004640",
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
