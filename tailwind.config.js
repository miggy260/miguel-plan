/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Design tokens ported from the legacy CSS variables
        'app-bg':  '#0C0C0A',
        'surface': '#141412',
        'subtle':  '#1E1E1A',
        'dark-border': '#222220',
        'gold':    '#E8D5A3',
        'sage':    '#7EC8A4',
        'coral':   '#E87C5A',
        'ivory':   '#F0EDE6',
        'stone':   '#666660',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        mono:  ['"DM Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
