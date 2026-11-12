/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        nunito: ['"Nunito"', 'system-ui', 'sans-serif']
      },
      colors: {
        duo: {
          green: '#58CC02',
          greenDark: '#58A700',
          blue: '#1CB0F6',
          blueDark: '#1899D6',
          yellow: '#FFC800',
          yellowDark: '#E5B400',
          red: '#FF4B4B',
          redDark: '#EA2B2B',
          purple: '#CE82FF',
          purpleDark: '#A568CC',
          gray: '#E5E5E5',
          grayDark: '#AFAFAF',
          ink: '#4B4B4B'
        }
      }
    }
  },
  plugins: []
};
