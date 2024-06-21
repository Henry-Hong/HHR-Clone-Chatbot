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
    function ({ addUtilities }) {
      const utilities = {
        '.animate-fade': {
          animation: 'fade 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',
        },
        '@keyframes fade': {
          from: {
            opacity: 0,
          },
          to: {
            opacity: 100,
          },
        },
      };
      addUtilities(utilities);
    },
    function ({ addUtilities }) {
      const utilities = {
        '.animate-popup-from-bottom': {
          animation: 'fadeBottom 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',
        },
        '@keyframes fadeBottom': {
          from: {
            opacity: 0,
            transform: 'translateY(50px)',
          },
          to: {
            opacity: 1,
            transform: 'translateY(0px)',
          },
        },
      };
      addUtilities(utilities);
    },
  ],
};
