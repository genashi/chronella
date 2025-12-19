import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import RegistrationPage from './pages/RegistrationPage';

// 1. Определение базовой темы
const theme = createTheme({
  palette: {
    mode: 'light', // Или 'dark'
    primary: {
      main: '#536525', 
    },
    secondary: {
      main: '#5b6147',
    },
    background: {
      default: '#fafaee',
      paper: '#fafaee',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif', // Базовый шрифт (Inter)
    h1: {
      fontFamily: '"Lora", serif', // Заголовки Lora
    },
    h2: {
      fontFamily: '"Lora", serif',
    },
    h3: {
      fontFamily: '"Lora", serif',
    },
    h4: {
      fontFamily: '"Lora", serif',
    },
    h5: {
      fontFamily: '"Lora", serif',
    },
    h6: {
      fontFamily: '"Lora", serif',
    },
  }
});

function App() {
  return (
    // 2. Оборачиваем приложение в ThemeProvider и CssBaseline
    <ThemeProvider theme={theme}>
      <CssBaseline /> {/* Сбрасывает стили и применяет фон темы */}
      
      {/* 3. Здесь будет  компонент страницы регистрации */}
      <RegistrationPage />
    
    </ThemeProvider>
  );
}

export default App
