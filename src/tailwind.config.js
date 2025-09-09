/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background-main)',
        surface: 'var(--background-surface)',
        surfaceMuted: 'var(--background-modal)',
        border: 'var(--border-light)',
        text: {
          DEFAULT: 'var(--text-main)',
          secondary: 'var(--text-secondary)',
        },
        heading: 'var(--heading)',
        accent: {
          DEFAULT: 'var(--accent-primary)',
          hover: 'var(--accent-primary-hover)',
          secondary: 'var(--accent-secondary)',
          secondaryHover: 'var(--accent-secondary-hover)',
        },
        success: 'var(--success)',
        warning: 'var(--warning)',
        error: 'var(--error)',
        // Claude aliases for backward compatibility
        claude: {
          accent: 'var(--claude-accent)',
          background: 'var(--claude-background)',
          surface: 'var(--claude-surface)',
          text: 'var(--claude-primary-text)',
          secondary: 'var(--claude-secondary-text)',
          heading: 'var(--claude-heading)',
        },
      },
      boxShadow: {
        card: '0 2px 8px rgba(181,183,186,.15)',
        cardHover: '0 4px 16px rgba(181,183,186,.20)',
        'claude-card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'claude-button': '0 2px 4px rgba(99, 91, 255, 0.2)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      spacing: {
        'claude-xs': 'var(--space-xs, 0.5rem)',
        'claude-sm': 'var(--space-sm, 0.75rem)',
        'claude-md': 'var(--space-md, 1rem)',
        'claude-lg': 'var(--space-lg, 1.5rem)',
        'claude-xl': 'var(--space-xl, 2rem)',
        'claude-2xl': 'var(--space-2xl, 3rem)',
      },
      borderRadius: {
        'claude-sm': 'var(--radius-sm, 8px)',
        'claude-md': 'var(--radius-md, 12px)',
        'claude-lg': 'var(--radius-lg, 16px)',
        'claude-xl': 'var(--radius-xl, 24px)',
        'claude-pill': 'var(--radius-pill, 50px)',
      },
    },
  },
  plugins: [],
}
