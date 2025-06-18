import { createTheme } from '@mui/material/styles';

// NIST-800 Dashboard Color Palette
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0052CC', // Blue
    },
    secondary: {
      main: '#172B4D', // Navy
    },
    background: {
      default: '#F4F5F7', // Neutral gray background
      paper: '#FFFFFF',
    },
    success: {
      main: '#36B37E', // Green
    },
    warning: {
      main: '#FFAB00', // Amber
    },
    error: {
      main: '#FF5630', // Red
    },
    text: {
      primary: '#172B4D',
      secondary: '#6B778C',
    },
    info: {
      main: '#1EBBDC', // Cyan for accents
    },
    divider: '#DFE1E6',
  },
  typography: {
    fontFamily: 'Inter, Roboto, Arial, sans-serif',
    h1: { fontWeight: 700, fontSize: '2.5rem', letterSpacing: '-0.02em' },
    h2: { fontWeight: 600, fontSize: '2rem' },
    h3: { fontWeight: 600, fontSize: '1.5rem' },
    h4: { fontWeight: 500, fontSize: '1.25rem' },
    body1: { fontSize: '1rem' },
    body2: { fontSize: '0.95rem' },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 12px rgba(23,43,77,0.08)',
          borderRadius: 16,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
});

export default theme;
