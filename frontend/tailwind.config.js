/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          '"Microsoft YaHei"',
          '"微软雅黑"',
          '"WenQuanYi Micro Hei"',
          'sans-serif',
        ],
      },
      colors: {
        primary: "#3b82f6", // Blue
        secondary: "#f3f4f6", // Gray
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
