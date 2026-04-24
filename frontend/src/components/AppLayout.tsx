import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Typography, IconButton, Tooltip, Avatar, Divider
} from '@mui/material';
import {
  CalendarMonth as CalendarIcon,
  School as GradesIcon,
  AccountCircle as ProfileIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Расписание', icon: <CalendarIcon />, path: '/schedule' },
  { label: 'Успеваемость', icon: <GradesIcon />, path: '/grades' },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    navigate('/login');
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: 'background.default' }}>
      {/* Navigation Rail */}
      <Box
        sx={{
          width: 80,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          py: 2,
          gap: 1,
          bgcolor: 'var(--md-sys-color-surface-container)',
          borderRight: '1px solid',
          borderColor: 'divider',
          flexShrink: 0,
        }}
      >
        {/* Логотип */}
        <Typography
          sx={{
            fontFamily: 'Lora, serif',
            fontSize: '0.7rem',
            fontWeight: 700,
            color: 'primary.main',
            mb: 2,
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}
        >
          Chr
        </Typography>

        <Divider sx={{ width: '50%', mb: 1 }} />

        {/* Nav items */}
        {NAV_ITEMS.map((item) => {
          const active = location.pathname.startsWith(item.path);
          return (
            <Tooltip key={item.path} title={item.label} placement="right">
              <Box
                onClick={() => navigate(item.path)}
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 4,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  bgcolor: active ? 'var(--md-sys-color-secondary-container)' : 'transparent',
                  color: active ? 'var(--md-sys-color-on-secondary-container)' : 'text.secondary',
                  transition: 'all 0.2s',
                  gap: 0.5,
                  '&:hover': {
                    bgcolor: active
                      ? 'var(--md-sys-color-secondary-container)'
                      : 'var(--md-sys-color-surface-container-high)',
                  },
                }}
              >
                {item.icon}
                <Typography sx={{ fontSize: '0.6rem', fontFamily: 'Inter, sans-serif' }}>
                  {item.label}
                </Typography>
              </Box>
            </Tooltip>
          );
        })}

        {/* Spacer */}
        <Box sx={{ flex: 1 }} />

        {/* Profile & Logout */}
        <Tooltip title="Профиль" placement="right">
          <IconButton sx={{ color: 'text.secondary' }}>
            <ProfileIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Выйти" placement="right">
          <IconButton onClick={handleLogout} sx={{ color: 'text.secondary', mb: 1 }}>
            <LogoutIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Main content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {children}
      </Box>
    </Box>
  );
}
