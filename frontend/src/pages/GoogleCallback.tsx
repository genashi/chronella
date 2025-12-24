import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';

const API_URL = 'http://localhost:8000';

const GoogleCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    
    if (!code) {
      setError('Код авторизации не получен от Google');
      setTimeout(() => {
        navigate('/setup');
      }, 3000);
      return;
    }

    const sendCodeToBackend = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          setError('Требуется авторизация. Перенаправление на страницу входа...');
          setTimeout(() => {
            navigate('/login');
          }, 2000);
          return;
        }

        const response = await fetch(`${API_URL}/auth/google/callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            auth_code: code,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: 'Ошибка при синхронизации календаря' }));
          throw new Error(errorData.detail || `Ошибка ${response.status}`);
        }

        // Успешно - перенаправляем на dashboard
        navigate('/dashboard');
      } catch (err) {
        console.error('Error during Google OAuth callback:', err);
        setError(err instanceof Error ? err.message : 'Ошибка при синхронизации календаря');
        setTimeout(() => {
          navigate('/setup');
        }, 3000);
      }
    };

    sendCodeToBackend();
  }, [searchParams, navigate]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'background.default',
        padding: 3,
      }}
    >
      {error ? (
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={48} sx={{ mb: 3, color: 'primary.main' }} />
          <Typography variant="h6" color="text.primary">
            Синхронизируем календарь...
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default GoogleCallback;

