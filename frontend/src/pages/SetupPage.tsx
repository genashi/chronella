import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Google as GoogleIcon } from '@mui/icons-material';

const API_URL = 'http://localhost:8000';

interface ProfileStatus {
  mrsu_linked: boolean;
  google_linked: boolean;
}

const SetupPage: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [mrsuLogin, setMrsuLogin] = useState('');
  const [mrsuPassword, setMrsuPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>({
    mrsu_linked: false,
    google_linked: false,
  });

  // Загружаем статус профиля
  useEffect(() => {
    const fetchProfileStatus = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        const response = await fetch(`${API_URL}/auth/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setProfileStatus({
            mrsu_linked: data.mrsu_linked || false,
            google_linked: data.google_linked || false,
          });

          // Определяем активный шаг на основе статуса
          if (!data.mrsu_linked) {
            setActiveStep(0);
          } else if (!data.google_linked) {
            setActiveStep(1);
          } else {
            setActiveStep(2);
          }
        }
      } catch (err) {
        console.error('Error fetching profile status:', err);
      }
    };

    fetchProfileStatus();
  }, []);

  const handleMrsuSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('Требуется авторизация. Пожалуйста, войдите в систему.');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/auth/link-mrsu`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          login: mrsuLogin,
          password: mrsuPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Учетные данные ЭИОС успешно привязаны!');
        setProfileStatus((prev) => ({ ...prev, mrsu_linked: true }));
        setMrsuLogin('');
        setMrsuPassword('');
        setActiveStep(1);
      } else {
        setError(data.detail || 'Ошибка при привязке учетных данных ЭИОС');
      }
    } catch (err) {
      setError('Не удалось подключиться к серверу. Убедитесь, что бэкенд запущен.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Редирект на Google OAuth
    window.location.href = `${API_URL}/auth/google/login`;
  };

  const handleGoToDashboard = () => {
    // Переход в личный кабинет
    window.location.href = '/dashboard';
  };

  const steps = [
    {
      label: 'Привязка ЭИОС',
      completed: profileStatus.mrsu_linked,
    },
    {
      label: 'Вход через Google',
      completed: profileStatus.google_linked,
    },
  ];

  const allStepsCompleted = profileStatus.mrsu_linked && profileStatus.google_linked;

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
      <Card
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 600,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <CardContent sx={{ p: { xs: 3, sm: 4, md: 5 } }}>
          <Typography
            component="h1"
            variant="h4"
            sx={{
              fontFamily: 'Lora, serif',
              mb: 4,
              textAlign: 'left',
            }}
          >
            Настройка аккаунта
          </Typography>

          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((step) => (
              <Step key={step.label} completed={step.completed}>
                <StepLabel
                  sx={{
                    '& .MuiStepLabel-label': {
                      fontFamily: 'Inter, sans-serif',
                    },
                  }}
                >
                  {step.label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
              {success}
            </Alert>
          )}

          {/* Шаг 1: Форма ЭИОС */}
          {activeStep === 0 && (
            <Box component="form" onSubmit={handleMrsuSubmit}>
              <Typography
                variant="body1"
                sx={{
                  mb: 3,
                  fontFamily: 'Inter, sans-serif',
                  color: 'text.secondary',
                }}
              >
                Введите ваши учетные данные для входа в ЭИОС Мордовского университета
              </Typography>

              <TextField
                margin="normal"
                required
                fullWidth
                id="mrsu-login"
                label="Логин ЭИОС"
                name="mrsu-login"
                autoComplete="username"
                value={mrsuLogin}
                onChange={(e) => setMrsuLogin(e.target.value)}
                autoFocus
                disabled={loading || profileStatus.mrsu_linked}
                sx={{
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />

              <TextField
                margin="normal"
                required
                fullWidth
                name="mrsu-password"
                label="Пароль ЭИОС"
                type="password"
                id="mrsu-password"
                autoComplete="current-password"
                value={mrsuPassword}
                onChange={(e) => setMrsuPassword(e.target.value)}
                disabled={loading || profileStatus.mrsu_linked}
                sx={{
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading || profileStatus.mrsu_linked}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 500,
                  boxShadow: 'none',
                  fontFamily: 'Inter, sans-serif',
                  '&:hover': {
                    boxShadow: 'none',
                    backgroundColor: 'primary.dark',
                  },
                }}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : profileStatus.mrsu_linked ? (
                  'Уже привязано'
                ) : (
                  'Привязать ЭИОС'
                )}
              </Button>
            </Box>
          )}

          {/* Шаг 2: Вход через Google */}
          {activeStep === 1 && (
            <Box>
              <Typography
                variant="body1"
                sx={{
                  mb: 3,
                  fontFamily: 'Inter, sans-serif',
                  color: 'text.secondary',
                }}
              >
                Привяжите ваш Google аккаунт для синхронизации календаря и других сервисов
              </Typography>

              <Button
                fullWidth
                variant="outlined"
                startIcon={<GoogleIcon />}
                onClick={handleGoogleLogin}
                disabled={profileStatus.google_linked}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 500,
                  fontFamily: 'Inter, sans-serif',
                  borderColor: 'divider',
                  '&:hover': {
                    borderColor: 'primary.main',
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                {profileStatus.google_linked
                  ? 'Google аккаунт привязан'
                  : 'Войти через Google'}
              </Button>
            </Box>
          )}

          {/* Кнопка перехода в личный кабинет */}
          {allStepsCompleted && (
            <Box sx={{ mt: 4 }}>
              <Button
                fullWidth
                variant="contained"
                onClick={handleGoToDashboard}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 500,
                  boxShadow: 'none',
                  fontFamily: 'Inter, sans-serif',
                  '&:hover': {
                    boxShadow: 'none',
                    backgroundColor: 'primary.dark',
                  },
                }}
              >
                Перейти в личный кабинет
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default SetupPage;

