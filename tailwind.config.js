import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'background-base': '#F7F2E7',
        'surface': '#FFFCF5',
        'primary': '#8FB89E',
        'primary-hover': '#7BA386',
        'secondary': '#7A9CB8',
        'text-primary': '#2D4A6B',
        'text-secondary': '#6B7A8A',
        'text-tertiary': '#A4BCCF',
        'border-soft': '#E5DFD2',
        'brand-accent': '#E89A8E',
        'status-accepted': '#7BA386',
        'status-rejected': '#D8A09C',
        'status-pending': '#C4B89A',
        'status-calling': '#7A9CB8',
        'status-no-answer': '#5C4A3A',
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'pill': '9999px',
      },
      transitionDuration: {
        '120': '120ms',
        '200': '200ms',
        '300': '300ms',
      },
      zIndex: {
        'sidebar': '10',
        'page-header': '20',
        'banner': '30',
        'modal-overlay': '100',
        'modal-content': '110',
        'toast': '200',
        'tooltip': '300',
      },
      boxShadow: {
        'modal': '0 8px 24px rgba(45, 74, 107, 0.12)',
      },
      animation: {
        'pulse-calling': 'pulse-calling 1500ms ease-in-out infinite',
      },
      keyframes: {
        'pulse-calling': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
    },
  },
} satisfies Config;
