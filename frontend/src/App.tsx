import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import SetupPage from './pages/SetupPage';
import RegistrationPage from './pages/RegistrationPage';
import LoginPage from './pages/LoginPage';

// Material Design 3 тема
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#536525', // Основной цвет из палитры
    },
    secondary: {
      main: '#5b6147',
    },
    background: {
      default: '#fafaee', // Светлый фон
      paper: '#fafaee',
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
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/" element={<Navigate to="/register" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App
