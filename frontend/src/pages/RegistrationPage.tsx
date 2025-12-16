import React, { useState } from 'react';
import { Container, Box, TextField, Button, Typography, Paper, Alert } from '@mui/material';
import { PersonAdd } from '@mui/icons-material'; // Иконка для кнопки

// Адрес нашего FastAPI бэкенда
const API_URL = 'http://localhost:8000/auth/register';

const RegistrationPage: React.FC = () => {
  // Состояния для хранения введенных данных
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Состояния для обратной связи
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Отправляем данные в формате JSON, который ожидает FastAPI
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Успешная регистрация (статус 200)
        setMessage({ 
          text: `Регистрация прошла успешно! Добро пожаловать, ${data.email}.`, 
          type: 'success' 
        });
        setEmail('');
        setPassword('');
      } else {
        // Ошибка регистрации (например, 400 Bad Request, если email занят)
        setMessage({ 
          text: data.detail || 'Ошибка регистрации. Попробуйте другой email.', 
          type: 'error' 
        });
      }
    } catch (error) {
      // Ошибка сети или другая техническая проблема
      console.error('Network Error:', error);
      setMessage({ 
        text: 'Не удалось подключиться к серверу. Убедитесь, что бэкенд запущен.', 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Paper elevation={3} sx={{ padding: 4, marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <PersonAdd color="primary" sx={{ fontSize: 40, mb: 1 }} />
        <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
          Регистрация студента
        </Typography>
        
        {/* Поле для вывода сообщений */}
        {message && (
          <Alert severity={message.type} sx={{ width: '100%', mb: 2 }}>
            {message.text}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1, width: '100%' }}>
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
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading}
            startIcon={<PersonAdd />}
            sx={{ mt: 3, mb: 2 }}
          >
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default RegistrationPage;