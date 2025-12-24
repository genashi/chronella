import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';

export default function GoogleCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const code = searchParams.get('code');

    useEffect(() => {
        const sendCodeToBackend = async () => {
            if (!code) return;

            try {
                const response = await fetch('http://localhost:8000/auth/google/callback', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ code })
                });

                if (response.ok) {
                    // Если успех — переходим в дешборд
                    navigate('/dashboard');
                } else {
                    console.error('Failed to exchange code');
                    navigate('/setup'); // Если ошибка — обратно в настройку
                }
            } catch (error) {
                console.error(error);
                navigate('/setup');
            }
        };

        sendCodeToBackend();
    }, [code, navigate]);

    return (
        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100vh">
            <CircularProgress />
            <Typography variant="h6" sx={{ mt: 2 }}>
                Завершаем настройку...
            </Typography>
        </Box>
    );
}