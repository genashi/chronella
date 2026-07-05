import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogContent, Typography, Box, Button, 
  Stack, Avatar, Divider, CircularProgress, Paper 
} from '@mui/material';
import { 
  Google as GoogleIcon, 
  School as EiosIcon
} from '@mui/icons-material';

interface ProfileDialogProps {
  open: boolean;
  onClose: () => void;
}

const API_URL = 'http://localhost:8000';

export default function ProfileDialog({ open, onClose }: ProfileDialogProps) {
  const [isGoogleLinked, setIsGoogleLinked] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  // Имитируем данные из ЭИОС
  const eiosUser = {
    name: "Калачин Даниил Александрович",
    avatarUrl: "" 
  };

  const checkGoogleStatus = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/auth/google/check`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setIsGoogleLinked(data.is_linked);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (open) checkGoogleStatus();
  }, [open]);

  const handleGoogleConnect = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/google/url`);
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleDisconnect = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/auth/google/disconnect`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setIsGoogleLinked(false);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      PaperProps={{
        sx: { borderRadius: 4, p: 3, maxWidth: 400, width: '100%', bgcolor: 'var(--md-sys-color-surface-container-high)' }
      }}
    >
      <DialogContent sx={{ p: 1 }}>
        <Stack spacing={3} alignItems="center">
          
          {/* ПРОФИЛЬ СТУДЕНТА */}
          <Stack spacing={1.5} alignItems="center" sx={{ width: '100%', pt: 1 }}>
            <Avatar 
              src={eiosUser.avatarUrl} 
              sx={{ width: 80, height: 80, bgcolor: 'primary.main', fontSize: '2rem', fontWeight: 600 }}
            >
              {eiosUser.name ? eiosUser.name[0] : 'U'}
            </Avatar>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" sx={{ fontFamily: 'Inter', fontWeight: 600, lineHeight: 1.2 }}>
                {eiosUser.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Inter', mt: 0.5 }}>
                {eiosUser.group}
              </Typography>
              <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5, px: 2, lineHeight: 1.1 }}>
                {eiosUser.faculty}
              </Typography>
            </Box>
          </Stack>

          <Divider sx={{ width: '100%' }} />

          {/* СИНХРОНИЗАЦИИ ("Пилюли") */}
          <Box sx={{ width: '100%', px: 1 }}>
            <Typography variant="overline" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 1.5 }}>
              Подключенные сервисы
            </Typography>
            
            <Stack spacing={1.5}>
              {/* Пилюля ЭИОС */}
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 4, bgcolor: 'background.paper', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <EiosIcon sx={{ color: 'primary.main' }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>ЭИОС API</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Основной источник
                    </Typography>
                  </Box>
                </Stack>
                {/* ЭИОС всегда подключен, поэтому кнопка стилизована как неактивный статус */}
                <Button 
                  size="small" 
                  disabled
                  sx={{ textTransform: 'none', borderRadius: 4, fontWeight: 600, color: 'success.main !important' }}
                >
                  Активно
                </Button>
              </Paper>

              {/* Пилюля GOOGLE */}
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 4, bgcolor: 'background.paper', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <GoogleIcon sx={{ color: isGoogleLinked ? 'primary.main' : 'text.disabled' }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>Google Календарь</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {isGoogleLinked === null ? "Проверка..." : isGoogleLinked ? "Синхронизация включена" : "Не подключен"}
                    </Typography>
                  </Box>
                </Stack>

                {isGoogleLinked === null || loading ? (
                  <CircularProgress size={20} />
                ) : isGoogleLinked ? (
                  <Button 
                    size="small" 
                    color="error" 
                    onClick={handleGoogleDisconnect}
                    sx={{ textTransform: 'none', borderRadius: 4, fontWeight: 600 }}
                  >
                    Отключить
                  </Button>
                ) : (
                  <Button 
                    size="small" 
                    variant="outlined" 
                    onClick={handleGoogleConnect}
                    sx={{ textTransform: 'none', borderRadius: 4, fontWeight: 600 }}
                  >
                    Войти
                  </Button>
                )}
              </Paper>
            </Stack>
          </Box>

          <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button onClick={onClose} color="inherit" sx={{ borderRadius: 10, textTransform: 'none', fontWeight: 600 }}>
              Закрыть
            </Button>
          </Box>

        </Stack>
      </DialogContent>
    </Dialog>
  );
}