import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Typography, IconButton, Tooltip
} from '@mui/material';
import {
  CalendarMonth as CalendarIcon,
  School as GradesIcon,
  AccountCircle as ProfileIcon,
  Logout as LogoutIcon,
  ViewTimeline as LogoIcon
} from '@mui/icons-material';
import ProfileDialog from './ProfileDialog'; 

const SIDEBAR_WIDTH = 104; 
const PILL_WIDTH = 64;     
const PILL_HEIGHT = 32;    

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Расписание', icon: <CalendarIcon fontSize="small" />, path: '/schedule' },
  { label: 'Успеваемость', icon: <GradesIcon fontSize="small" />, path: '/grades' },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    navigate('/login');
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', width: '100vw', bgcolor: 'var(--md-sys-color-surface)' }}>
      {/* --- ЛЕВЫЙ САЙДБАР --- */}
      <Box
        sx={{
          width: SIDEBAR_WIDTH,
          height: '100%',
          bgcolor: 'var(--md-sys-color-surface-container-low)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          py: 2,
          boxSizing: 'border-box',
          borderRight: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, mb: 4, mt: 1 }}>
          <LogoIcon sx={{ color: 'primary.main', fontSize: 28 }} />
          <Typography
            sx={{
              fontFamily: 'Lora, serif',
              fontWeight: 700,
              fontSize: '0.9rem',
              color: 'primary.main',
              letterSpacing: '0.5px'
            }}
          >
            Chronella
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
          {NAV_ITEMS.map((item) => {
            const active = location.pathname.startsWith(item.path);
            return (
              <Box
                key={item.path}
                onClick={() => navigate(item.path)}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 0.5,
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                <Box
                  sx={{
                    width: PILL_WIDTH,
                    height: PILL_HEIGHT,
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: active ? 'var(--md-sys-color-secondary-container)' : 'transparent',
                    color: active ? 'var(--md-sys-color-on-secondary-container)' : 'text.secondary',
                  }}
                >
                  {item.icon}
                </Box>

                <Typography
                  sx={{
                    fontSize: '0.75rem',
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: active ? 700 : 500,
                    color: active ? 'text.primary' : 'text.secondary',
                    textAlign: 'center',
                    lineHeight: 1.2
                  }}
                >
                  {item.label}
                </Typography>
              </Box>
            );
          })}
        </Box>

        <Box sx={{ flex: 1 }} />

        <Tooltip title="Профиль" placement="right">
          <IconButton onClick={() => setProfileOpen(true)} sx={{ color: 'text.secondary', mb: 1 }}>
            <ProfileIcon />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Выйти" placement="right">
          <IconButton onClick={handleLogout} sx={{ color: 'text.secondary' }}>
            <LogoutIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* --- ОСНОВНОЙ КОНТЕНТ --- */}
      <Box sx={{ flex: 1, height: '100%', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {children}
      </Box>

      {/* Окно профиля */}
      <ProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} />
    </Box>
  );
}