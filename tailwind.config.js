/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [
    function ({ addUtilities }) {
      const utilities = {
        '.loading': {
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: 'rgb(243 244 246)',
        },
        '.loading::after': {
          display: 'block',
          position: 'absolute',
          height: '100%',
          top: 0,
          left: '-10rem',
          width: '10rem',
          content: "''",
          background: 'linear-gradient(to right, transparent 0%, #E8E8E8 50%, transparent 100%)',
          animation: 'skeletonloading 1s cubic-bezier(0.4, 0.0, 0.2, 1) infinite',
        },
        '@keyframes skeletonloading': {
          from: {
            left: '-10rem',
          },
          to: {
            left: '100%',
          },
        },
      };

      addUtilities(utilities);
    },
  ],
};
