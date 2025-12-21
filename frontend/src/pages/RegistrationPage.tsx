import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Alert,
  Link,
} from '@mui/material';
import { PersonAdd } from '@mui/icons-material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:8000/auth/register';

const RegistrationPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    // Валидация совпадения паролей
    if (password !== confirmPassword) {
      setMessage({
        text: 'Пароли не совпадают. Пожалуйста, проверьте введенные данные.',
        type: 'error',
      });
      setLoading(false);
      return;
    }

    // Валидация минимальной длины пароля
    if (password.length < 6) {
      setMessage({
        text: 'Пароль должен содержать минимум 6 символов.',
        type: 'error',
      });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Отправляем и email, и username (на случай, если бэкенд ожидает username)
        body: JSON.stringify({ email, password }),
      });

      const contentType = response.headers.get('content-type');
      let data;

      if (contentType && contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch (jsonError) {
          const text = await response.text();
          throw new Error(`Failed to parse JSON response: ${text}`);
        }
      } else {
        const text = await response.text();
        throw new Error(`Server returned non-JSON response: ${text}`);
      }

      if (response.ok) {
        setMessage({
          text: `Регистрация прошла успешно! Добро пожаловать, ${data.email || data.username || ''}.`,
          type: 'success',
        });
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        // Перенаправляем на страницу входа после успешной регистрации
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        console.error('Registration failed', response.status, data);
        const serverMessage = data?.detail || data?.message || JSON.stringify(data) || 'Ошибка регистрации. Попробуйте еще раз.';
        setMessage({
          text: `Ошибка ${response.status}: ${serverMessage}`,
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Registration Error:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        setMessage({
          text: 'Не удалось подключиться к серверу. Убедитесь, что бэкенд запущен на http://localhost:8000',
          type: 'error',
        });
      } else if (error instanceof Error) {
        setMessage({
          text: `Ошибка: ${error.message}`,
          type: 'error',
        });
      } else {
        setMessage({
          text: 'Произошла неизвестная ошибка. Попробуйте еще раз.',
          type: 'error',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'background.default',
        padding: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          padding: { xs: 3, sm: 4, md: 5 },
          width: '100%',
          maxWidth: 450,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, alignSelf: 'flex-start' }}>
          <PersonAdd
            color="primary"
            sx={{
              fontSize: 32,
              mr: 1.5,
            }}
          />
          <Typography
            component="h1"
            variant="h4"
            sx={{
              fontFamily: 'Lora, serif',
            }}
          >
            Регистрация
          </Typography>
        </Box>

        {message && (
          <Alert
            severity={message.type}
            sx={{
              width: '100%',
              mb: 3,
              borderRadius: 2,
            }}
          >
            {message.text}
          </Alert>
        )}

        <Box
          component="form"
          onSubmit={handleSubmit}
          noValidate
          sx={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email (для входа)"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            sx={{
              maxWidth: 400,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Пароль"
            type="password"
            id="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            helperText={password.length > 0 && password.length < 6 ? 'Минимум 6 символов' : ''}
            error={password.length > 0 && password.length < 6}
            sx={{
              maxWidth: 400,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="confirmPassword"
            label="Подтвердите пароль"
            type="password"
            id="confirmPassword"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            helperText={confirmPassword.length > 0 && password !== confirmPassword ? 'Пароли не совпадают' : ''}
            error={confirmPassword.length > 0 && password !== confirmPassword}
            sx={{
              maxWidth: 400,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading}
            startIcon={<PersonAdd />}
            sx={{
              mt: 4,
              mb: 2,
              maxWidth: 400,
              borderRadius: 2,
              textTransform: 'none',
              py: 1.5,
              fontSize: '1rem',
              fontWeight: 500,
              boxShadow: 'none',
              '&:hover': {
                boxShadow: 'none',
                backgroundColor: 'primary.dark',
              },
            }}
          >
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </Button>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Есть аккаунт?{' '}
            <Link
              component={RouterLink}
              to="/login"
              sx={{
                color: 'primary.main',
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline',
                },
              }}
            >
              Войти
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default RegistrationPage;

