import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import SetupPage from './pages/SetupPage';
import RegistrationPage from './pages/RegistrationPage';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';

// Material Design 3 тема
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#536525', // rgb(83 101 37)
      light: '#d6eb9c', // primary-container
      dark: '#3c4c0e', // on-primary-container
      contrastText: '#ffffff', // on-primary
    },
    secondary: {
      main: '#5b6147', // rgb(91 97 71)
      light: '#dfe6c4', // secondary-container
      dark: '#434931', // on-secondary-container
      contrastText: '#ffffff', // on-secondary
    },
    error: {
      main: '#ba1a1a', // rgb(186 26 26)
      light: '#ffdad6', // error-container
      dark: '#93000a', // on-error-container
      contrastText: '#ffffff', // on-error
    },
    background: {
      default: '#fafaee', // rgb(250 250 238)
      paper: '#fafaee',
    },
    text: {
      primary: '#1b1c15', // on-background / on-surface
      secondary: '#45483c', // on-surface-variant
    },
    divider: '#c6c8b8', // outline-variant
    // Дополнительные цвета Material Design 3
    action: {
      active: '#1b1c15',
      hover: 'rgba(27, 28, 21, 0.04)',
      selected: 'rgba(27, 28, 21, 0.08)',
      disabled: 'rgba(27, 28, 21, 0.26)',
      disabledBackground: 'rgba(27, 28, 21, 0.12)',
    },
  },
  // Расширение темы для кастомных цветов
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        ':root': {
          '--md-sys-color-primary': 'rgb(83 101 37)',
          '--md-sys-color-surface-tint': 'rgb(83 101 37)',
          '--md-sys-color-on-primary': 'rgb(255 255 255)',
          '--md-sys-color-primary-container': 'rgb(214 235 156)',
          '--md-sys-color-on-primary-container': 'rgb(60 76 14)',
          '--md-sys-color-secondary': 'rgb(91 97 71)',
          '--md-sys-color-on-secondary': 'rgb(255 255 255)',
          '--md-sys-color-secondary-container': 'rgb(223 230 196)',
          '--md-sys-color-on-secondary-container': 'rgb(67 73 49)',
          '--md-sys-color-tertiary': 'rgb(57 102 95)',
          '--md-sys-color-on-tertiary': 'rgb(255 255 255)',
          '--md-sys-color-tertiary-container': 'rgb(188 236 226)',
          '--md-sys-color-on-tertiary-container': 'rgb(32 78 71)',
          '--md-sys-color-error': 'rgb(186 26 26)',
          '--md-sys-color-on-error': 'rgb(255 255 255)',
          '--md-sys-color-error-container': 'rgb(255 218 214)',
          '--md-sys-color-on-error-container': 'rgb(147 0 10)',
          '--md-sys-color-background': 'rgb(250 250 238)',
          '--md-sys-color-on-background': 'rgb(27 28 21)',
          '--md-sys-color-surface': 'rgb(250 250 238)',
          '--md-sys-color-on-surface': 'rgb(27 28 21)',
          '--md-sys-color-surface-variant': 'rgb(226 228 212)',
          '--md-sys-color-on-surface-variant': 'rgb(69 72 60)',
          '--md-sys-color-outline': 'rgb(118 120 107)',
          '--md-sys-color-outline-variant': 'rgb(198 200 184)',
          '--md-sys-color-shadow': 'rgb(0 0 0)',
          '--md-sys-color-scrim': 'rgb(0 0 0)',
          '--md-sys-color-inverse-surface': 'rgb(48 49 41)',
          '--md-sys-color-inverse-on-surface': 'rgb(242 241 229)',
          '--md-sys-color-inverse-primary': 'rgb(186 207 130)',
          '--md-sys-color-primary-fixed': 'rgb(214 235 156)',
          '--md-sys-color-on-primary-fixed': 'rgb(22 31 0)',
          '--md-sys-color-primary-fixed-dim': 'rgb(186 207 130)',
          '--md-sys-color-on-primary-fixed-variant': 'rgb(60 76 14)',
          '--md-sys-color-secondary-fixed': 'rgb(223 230 196)',
          '--md-sys-color-on-secondary-fixed': 'rgb(24 30 9)',
          '--md-sys-color-secondary-fixed-dim': 'rgb(195 202 170)',
          '--md-sys-color-on-secondary-fixed-variant': 'rgb(67 73 49)',
          '--md-sys-color-tertiary-fixed': 'rgb(188 236 226)',
          '--md-sys-color-on-tertiary-fixed': 'rgb(0 32 28)',
          '--md-sys-color-tertiary-fixed-dim': 'rgb(161 208 199)',
          '--md-sys-color-on-tertiary-fixed-variant': 'rgb(32 78 71)',
          '--md-sys-color-surface-dim': 'rgb(219 219 207)',
          '--md-sys-color-surface-bright': 'rgb(250 250 238)',
          '--md-sys-color-surface-container-lowest': 'rgb(255 255 255)',
          '--md-sys-color-surface-container-low': 'rgb(245 244 232)',
          '--md-sys-color-surface-container': 'rgb(239 239 226)',
          '--md-sys-color-surface-container-high': 'rgb(233 233 221)',
          '--md-sys-color-surface-container-highest': 'rgb(227 227 215)',
        },
      },
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontFamily: '"Lora", serif' },
    h2: { fontFamily: '"Lora", serif' },
    h3: { fontFamily: '"Lora", serif' },
    h4: { fontFamily: '"Lora", serif' },
    h5: { fontFamily: '"Lora", serif' },
    h6: { fontFamily: '"Lora", serif' },
  },
  shape: {
    borderRadius: 12, // Material Design 3 использует большие закругления
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/register" element={<RegistrationPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/setup"
            element={
              <ProtectedRoute>
                <SetupPage />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/register" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App
