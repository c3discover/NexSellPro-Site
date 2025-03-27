/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'rgb(var(--primary-rgb))',
          dark: 'rgb(35, 165, 165)',
          light: 'rgb(75, 205, 205)'
        },
        accent: {
          DEFAULT: 'rgb(var(--accent-rgb))',
          dark: 'rgb(235, 87, 33)',
          light: 'rgb(255, 127, 73)'
        },
        neutral: {
          dark: '#111827',
          DEFAULT: '#1F2937',
          light: '#374151'
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'hero-pattern': "url('/assets/hero-bg.png')",
        'features-pattern': "url('/assets/features-bg.png')"
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'slide-up': 'slideUp 0.5s ease-out forwards',
        'slide-down': 'slideDown 0.5s ease-out forwards',
        'fade-in': 'fadeIn 0.5s ease-out forwards'
      }
    },
  },
  plugins: [],
} 