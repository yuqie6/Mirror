/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // 使用系统默认字体栈，优先 Apple 字体
        sans: ['SF Pro Display', 'SF Pro Text', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Apple 风格强调色
        apple: {
          blue: '#0A84FF',
          purple: '#BF5AF2',
          pink: '#FF2D55',
          green: '#30D158',
          gray: '#8E8E93',
        },
        // 玻璃拟态调色板 - 增强可见性
        glass: {
          50: 'rgba(255, 255, 255, 0.04)',
          100: 'rgba(255, 255, 255, 0.06)',
          200: 'rgba(255, 255, 255, 0.10)',
          300: 'rgba(255, 255, 255, 0.15)',
          400: 'rgba(255, 255, 255, 0.20)',
        },
        // 高级深色背景
        dark: {
          bg: '#000000',
          surface: '#0D0D0D',
          elevated: '#1C1C1E',
        }
      },
      backdropBlur: {
        xs: '2px',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out forwards',
        'slide-up': 'slide-up 0.6s ease-out forwards',
      }
    },
  },
  plugins: [],
}
