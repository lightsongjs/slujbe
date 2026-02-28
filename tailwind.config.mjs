/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Palatino Linotype"', "Palatino", "Georgia", "serif"],
      },
      colors: {
        rubric: "#b91c1c",
      },
      fontSize: {
        liturgical: ["1.125rem", { lineHeight: "1.85" }],
      },
    },
  },
  plugins: [],
};
