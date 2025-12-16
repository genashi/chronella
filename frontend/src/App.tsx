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
    fontFamily: 'Inter, sans-serif',
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
