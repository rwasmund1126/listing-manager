import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Warm industrial palette
        canvas: '#FAF8F5',
        ink: '#1C1917',
        muted: '#78716C',
        border: '#E7E5E4',
        surface: '#FFFFFF',
        // Accent colors for platforms
        ebay: {
          DEFAULT: '#E53238',
          light: '#FEE2E2',
        },
        facebook: {
          DEFAULT: '#1877F2',
          light: '#DBEAFE',
        },
        craigslist: {
          DEFAULT: '#5B21B6',
          light: '#EDE9FE',
        },
        // Status colors
        success: '#16A34A',
        warning: '#CA8A04',
        danger: '#DC2626',
      },
      fontFamily: {
        display: ['Georgia', 'serif'],
        body: ['system-ui', '-apple-system', 'sans-serif'],
        mono: ['SF Mono', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'card': '0 1px 3px rgba(28, 25, 23, 0.08), 0 1px 2px rgba(28, 25, 23, 0.04)',
        'card-hover': '0 4px 12px rgba(28, 25, 23, 0.12), 0 2px 4px rgba(28, 25, 23, 0.08)',
        'button': '0 1px 2px rgba(28, 25, 23, 0.1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
}
export default config
