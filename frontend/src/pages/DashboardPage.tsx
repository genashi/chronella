import { Box, Typography } from '@mui/material';

export default function DashboardPage() {
    return (
        <Box sx={{ p: 4 }}>
            <Typography variant="h4" fontFamily="Lora, serif">
                Личный кабинет
            </Typography>
            <Typography sx={{ mt: 2, color: 'text.secondary' }}>
                Здесь будет расписание и успеваемость
            </Typography>
        </Box>
    );
}