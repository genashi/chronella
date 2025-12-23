import React, { useState, useEffect, useCallback } from 'react';
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
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:8000';

interface ProfileStatus {
  mrsu_linked: boolean;
  google_linked: boolean;
  is_mrsu_verified?: boolean;
}

const SetupPage: React.FC = () => {
  const navigate = useNavigate();

  // Current step (0 - ЭИОС, 1 - Google, 2 - Готово)
  const [activeStep, setActiveStep] = useState(0);

  // Form fields
  const [mrsuLogin, setMrsuLogin] = useState('');
  const [mrsuPassword, setMrsuPassword] = useState('');

  // UI status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // User flags in DB
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>({
    mrsu_linked: false,
    google_linked: false,
  });

  /**
   * Получение статуса профиля из БД, корректирует stepper.
   * Показывает Google шаг если is_mrsu_verified === true.
   */
  const fetchProfileStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        navigate('/login');
        return;
      }
      const response = await fetch(`${API_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const nextStatus: ProfileStatus = {
          mrsu_linked: !!data.mrsu_linked,
          google_linked: !!data.google_linked,
          is_mrsu_verified: !!data.is_mrsu_verified,
        };
        setProfileStatus(nextStatus);

        // Проверка для skip ЭИОС шага
        if (nextStatus.is_mrsu_verified || nextStatus.mrsu_linked) {
          // Привязка ЭИОС уже подтверждена
          if (!nextStatus.google_linked) {
            setActiveStep(1);
          } else {
            setActiveStep(2);
          }
        } else {
          setActiveStep(0);
        }
      } else if (response.status === 401) {
        localStorage.removeItem('access_token');
        navigate('/login');
      } else {
        setError('Ошибка при получении данных профиля.');
      }
    } catch (err) {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    fetchProfileStatus();
    // eslint-disable-next-line
  }, [fetchProfileStatus]);

  // ---- Шаг 1. Привязка ЭИОС
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
        setSuccess('Учетные данные ЭИОС успешно привязаны!');
        setMrsuLogin('');
        setMrsuPassword('');
        // При успехе сразу переводим на шаг Google
        setActiveStep(1);
        setProfileStatus((prev) => ({
          ...prev,
          mrsu_linked: true,
          is_mrsu_verified: true,
        }));
      } else if (response.status === 401) {
        localStorage.removeItem('access_token');
        navigate('/login');
      } else {
        setError(data?.detail || data?.message || 'Ошибка при привязке учетных данных ЭИОС');
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(`Ошибка: ${err.message}`);
      } else {
        setError('Не удалось подключиться к серверу. Убедитесь, что бэкенд запущен.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ---- Шаг 2. Привязка Google через переадресацию — только кнопка!
  const handleGoogleRedirect = () => {
    window.location.href = `${API_URL}/auth/google/login`;
  };

  // --- После Google OAuth если фронт был редиректнут, повторно refetch
  useEffect(() => {
    const hash = window.location.hash || window.location.search;
    if (
      (hash && hash.includes('google_oauth')) ||
      window.location.pathname.endsWith('/setup')
    ) {
      fetchProfileStatus();
    }
    // eslint-disable-next-line
  }, []);

  // Шаг 3. Готово
  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  const steps = [
    {
      label: 'Привязка ЭИОС',
      completed: profileStatus.is_mrsu_verified || profileStatus.mrsu_linked,
    },
    {
      label: 'Привязка Google',
      completed: profileStatus.google_linked,
    },
    {
      label: 'Все готово',
      completed: (profileStatus.is_mrsu_verified || profileStatus.mrsu_linked) && profileStatus.google_linked,
    },
  ];

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
                disabled={loading}
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
                disabled={loading}
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
                disabled={loading}
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
                ) : (
                  'Привязать ЭИОС'
                )}
              </Button>
            </Box>
          )}

          {/* Шаг 2: Привязка Google */}
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
                onClick={handleGoogleRedirect}
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
                  : 'Привязать Google Календарь'}
              </Button>
            </Box>
          )}

          {/* Шаг 3: Готово */}
          {activeStep === 2 && (
            <Box sx={{ mt: 4, textAlign: 'center' }}>
              <Typography
                variant="h5"
                sx={{ mb: 2, fontFamily: 'Lora, serif', color: 'success.main' }}
              >
                Все системы готовы!
              </Typography>
              <Typography sx={{ mb: 4, color: 'text.secondary', fontFamily: 'Inter, sans-serif' }}>
                Вы успешно прошли настройку. Теперь можно перейти в личный кабинет.
              </Typography>
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
