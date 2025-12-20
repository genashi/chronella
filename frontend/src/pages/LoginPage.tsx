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
import { Login as LoginIcon } from '@mui/icons-material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:8000/auth/login';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.access_token) {
          localStorage.setItem('access_token', data.access_token);
          console.log('Success');
          setMessage({
            text: 'Вход выполнен успешно!',
            type: 'success',
          });
          // Перенаправляем на страницу настройки после успешного входа
          setTimeout(() => {
            navigate('/setup');
          }, 1500);
        } else {
          setMessage({
            text: 'Токен не получен от сервера.',
            type: 'error',
          });
        }
      } else {
        setMessage({
          text: data.detail || 'Неверный email или пароль.',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Network Error:', error);
      setMessage({
        text: 'Не удалось подключиться к серверу. Убедитесь, что бэкенд запущен.',
        type: 'error',
      });
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
          <LoginIcon
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
            Вход
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
            label="Email"
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
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
            startIcon={<LoginIcon />}
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
            {loading ? 'Вход...' : 'Войти'}
          </Button>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Нет аккаунта?{' '}
            <Link
              component={RouterLink}
              to="/register"
              sx={{
                color: 'primary.main',
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline',
                },
              }}
            >
              Зарегистрироваться
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default LoginPage;

