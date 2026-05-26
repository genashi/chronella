import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Card, Divider, List, ListItem, ListItemButton, ListItemText, 
  Skeleton, Stack, Chip, LinearProgress, MenuItem, Select, TextField, Paper,
  Checkbox, FormControlLabel // Добавили новые компоненты
} from '@mui/material';
import { School as GradesIcon, ChevronRight, AssignmentOutlined } from '@mui/icons-material';
import AppLayout from '../components/AppLayout';

const API_URL = 'http://localhost:8000';

export default function GradesPage() {
  const [disciplines, setDisciplines] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getStatusColor = (points: number) => {
    if (points < 40) return '#B3261E'; // Error
    if (points < 61) return '#F9A825'; // Warning
    return '#2E7D32'; // Success
  };

  useEffect(() => {
    fetchDisciplines();
  }, []);

  const fetchDisciplines = async () => {
    try {
      setLoadingList(true);
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/performance/disciplines`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setDisciplines(data);
      if (data.length > 0) handleSelect(data[0]);
    } catch (err: any) { setError(err.message); }
    finally { setLoadingList(false); }
  };

  const handleSelect = async (discipline: any) => {
    setSelectedId(discipline.id);
    setLoadingPlan(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/performance/discipline/${discipline.mrsu_id}/plan`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setSelectedPlan(data);
    } catch (e) { console.error(e); }
    finally { setLoadingPlan(false); }
  };

  // Обновили тип value на any, чтобы принимать bool от чекбокса
  const handleUpdateDot = async (dbId: number, field: 'type' | 'deadline' | 'is_late', value: any) => {
    try {
      const token = localStorage.getItem('access_token');
      await fetch(`${API_URL}/performance/control-points/${dbId}`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ [field]: value })
      });
    } catch (e) {
      console.error("Ошибка сохранения:", e);
    }
  };

  const totalPoints = selectedPlan?.Sections?.reduce((acc: number, sec: any) => 
    acc + sec.ControlDots?.reduce((dotAcc: number, dot: any) => dotAcc + (dot.Mark?.Ball || 0), 0), 0
  ) || 0;

  // Функция проверки, является ли раздел экзаменом/зачетом
  const isExamSection = (title: string) => {
    const t = title.toLowerCase();
    return t.includes('экзамен') || t.includes('зачет') || t.includes('аттестация');
  };

  return (
    <AppLayout>
      <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <GradesIcon sx={{ color: 'primary.main', fontSize: 26 }} />
          <Typography variant="h5" sx={{ fontFamily: 'Lora, serif' }}>Успеваемость</Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
          
          <Box sx={{ width: { xs: '100%', md: 350 }, flexShrink: 0 }}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4, overflow: 'hidden' }}>
              <List sx={{ p: 0 }}>
                {loadingList ? (
                  [1, 2, 3, 4].map(i => <Box key={i} sx={{ p: 2 }}><Skeleton variant="text" height={30} /></Box>)
                ) : disciplines.map((d, idx) => (
                  <React.Fragment key={d.id}>
                    <ListItem disablePadding>
                      <ListItemButton 
                        selected={selectedId === d.id}
                        onClick={() => handleSelect(d)}
                        sx={{ py: 2, '&.Mui-selected': { bgcolor: 'var(--md-sys-color-primary-container)' } }}
                      >
                        <ListItemText 
                          primary={d.name} 
                          primaryTypographyProps={{ fontFamily: 'Inter', fontWeight: 500, fontSize: '0.9rem' }}
                        />
                        <ChevronRight fontSize="small" sx={{ color: 'text.disabled' }} />
                      </ListItemButton>
                    </ListItem>
                    {idx < disciplines.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Card>
          </Box>

          <Box sx={{ flex: 1 }}>
            <Card elevation={0} sx={{ 
              border: '1px solid', borderColor: 'divider', borderRadius: 4, 
              p: 4, minHeight: 600, bgcolor: 'var(--md-sys-color-surface-container-low)'
            }}>
              {loadingPlan ? (
                <Stack spacing={2} sx={{ width: '100%' }}>
                  <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 2 }} />
                  <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
                </Stack>
              ) : selectedPlan ? (
                <Box>
                  <Box sx={{ mb: 4 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 1.5 }}>
                      <Typography variant="h6" sx={{ fontFamily: 'Lora', fontWeight: 600 }}>
                        {disciplines.find(d => d.id === selectedId)?.name}
                      </Typography>
                      <Typography variant="h5" sx={{ fontFamily: 'Inter', fontWeight: 700, color: getStatusColor(totalPoints) }}>
                        {totalPoints.toFixed(1)} <Typography component="span" variant="body1" color="text.secondary">/ 100</Typography>
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={Math.min(totalPoints, 100)} 
                      sx={{ 
                        height: 10, borderRadius: 5, bgcolor: 'rgba(0,0,0,0.05)',
                        '& .MuiLinearProgress-bar': { bgcolor: getStatusColor(totalPoints) }
                      }} 
                    />
                  </Box>

                  <Stack spacing={4}>
                    {selectedPlan.Sections?.map((section: any) => {
                      const regularDots = section.ControlDots?.filter((dot: any) => dot.custom_type !== 'exam') || [];
                      const examDots = section.ControlDots?.filter((dot: any) => dot.custom_type === 'exam') || [];

                      return (
                        <Box key={section.Id} sx={{ mb: 4 }}>
                          {regularDots.length > 0 && (
                            <>
                              <Typography variant="overline" sx={{ fontWeight: 800, color: 'primary.main', mb: 1, display: 'block' }}>
                                {section.Title}
                              </Typography>
                              <Stack spacing={1.5} sx={{ mb: examDots.length > 0 ? 2 : 0 }}>
                                {regularDots.map((dot: any) => (
                                  <Paper key={dot.Id} variant="outlined" sx={{ 
                                    p: 2, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 2,
                                    transition: '0.2s', '&:hover': { borderColor: 'primary.main' }
                                  }}>
                                    <Box sx={{ flex: 1 }}>
                                      <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'Inter' }}>{dot.Title}</Typography>
                                      <Typography variant="caption" color="text.secondary">Макс. балл: {dot.MaxBall}</Typography>
                                    </Box>
                                    <Stack direction="row" spacing={2} alignItems="center">
                                      <Select 
                                        size="small" 
                                        defaultValue={dot.custom_type || "lab"} 
                                        onChange={(e) => handleUpdateDot(dot.db_id, 'type', e.target.value)}
                                        sx={{ height: 35, fontSize: '0.8rem', borderRadius: 2, minWidth: 130 }}
                                      >
                                        <MenuItem value="control">Контрольная</MenuItem>
                                        <MenuItem value="lab">Лабораторная</MenuItem>
                                        <MenuItem value="test">Тест</MenuItem>
                                        <MenuItem value="exam">Зачет/Экзамен</MenuItem>
                                      </Select>
                                      <TextField 
                                        type="date"
                                        size="small"
                                        defaultValue={dot.custom_deadline || ""}
                                        onChange={(e) => handleUpdateDot(dot.db_id, 'deadline', e.target.value)}
                                        sx={{ '& .MuiInputBase-input': { fontSize: '0.8rem', height: 18 } }}
                                      />
                                      <FormControlLabel
                                        control={
                                          <Checkbox 
                                            size="small" 
                                            defaultChecked={dot.custom_is_late === false} 
                                            onChange={(e) => handleUpdateDot(dot.db_id, 'is_late', !e.target.checked)}
                                          />
                                        }
                                        label={<Typography variant="caption" sx={{ fontFamily: 'Inter' }}>Сдано вовремя</Typography>}
                                        sx={{ mr: 0 }}
                                      />
                                      <Chip label={dot.Mark?.Ball ? `${dot.Mark.Ball} баллов` : "Нет оценки"} color={dot.Mark?.Ball ? "success" : "default"} size="small" variant={dot.Mark?.Ball ? "filled" : "outlined"} sx={{ fontWeight: 600, minWidth: 80 }} />
                                    </Stack>
                                  </Paper>
                                ))}
                              </Stack>
                            </>
                          )}

                          {examDots.length > 0 && (
                            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 4, bgcolor: 'var(--md-sys-color-error-container)', borderColor: 'error.light', borderWidth: '1px', borderStyle: 'solid' }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'error.main', mb: 1.5, fontFamily: 'Inter', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                                Итоговая аттестация по разделу
                              </Typography>
                              <Stack spacing={1.5}>
                                {examDots.map((dot: any) => (
                                  <Box key={dot.Id} sx={{ display: 'flex', alignItems: 'center', justify_content: 'space-between', gap: 2, p: 1.5, bgcolor: 'var(--md-sys-color-surface-container-lowest)', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                                    <Box sx={{ flex: 1 }}>
                                      <Typography variant="body2" sx={{编程Текст: 'Inter', fontWeight: 600 }}>{dot.Title}</Typography>
                                      <Typography variant="caption" color="text.secondary">Максимально: {dot.MaxBall} б.</Typography>
                                    </Box>
                                    <Stack direction="row" spacing={2} alignItems="center">
                                      <TextField 
                                        type="date"
                                        size="small"
                                        label="Дата проведения"
                                        InputLabelProps={{ shrink: true }}
                                        defaultValue={dot.custom_deadline || ""}
                                        onChange={(e) => handleUpdateDot(dot.db_id, 'deadline', e.target.value)}
                                        sx={{ '& .MuiInputBase-input': { fontSize: '0.8rem', height: 18 }, width: 160 }}
                                      />
                                      <Chip label={dot.Mark?.Ball ? `${dot.Mark.Ball} баллов` : "Нет оценки"} color={dot.Mark?.Ball ? "success" : "default"} size="small" variant={dot.Mark?.Ball ? "filled" : "outlined"} sx={{ fontWeight: 600, minWidth: 80 }} />
                                    </Stack>
                                  </Box>
                                ))}
                              </Stack>
                            </Paper>
                          )}
                        </Box>
                      );
                    })}
                  </Stack>
                </Box>
              ) : (
                <Stack alignItems="center" justifyContent="center" sx={{ height: 400, opacity: 0.5 }}>
                  <AssignmentOutlined sx={{ fontSize: 48, mb: 2 }} />
                  <Typography>Выберите предмет для просмотра деталей</Typography>
                </Stack>
              )}
            </Card>
          </Box>

        </Box>
      </Box>
    </AppLayout>
  );
}