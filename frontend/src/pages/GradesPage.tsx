import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Card, Divider, List, ListItem, ListItemButton, ListItemText, 
  Skeleton, Stack, Chip, LinearProgress, MenuItem, Select, TextField, Paper
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

  // Цвета MD3 для прогресса
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

  // Расчет общего балла
  const totalPoints = selectedPlan?.Sections?.reduce((acc: number, sec: any) => 
    acc + sec.ControlDots?.reduce((dotAcc: number, dot: any) => dotAcc + (dot.Mark?.Ball || 0), 0), 0
  ) || 0;

  return (
    <AppLayout>
      <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <GradesIcon sx={{ color: 'primary.main', fontSize: 26 }} />
          <Typography variant="h5" sx={{ fontFamily: 'Lora, serif' }}>Успеваемость</Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
          
          {/* ЛЕВАЯ ЧАСТЬ: Список дисциплин */}
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

          {/* ПРАВАЯ ЧАСТЬ: Детализация */}
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
                  {/* Заголовок предмета и Прогресс */}
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

                  {/* Списки контрольных точек по разделам */}
                  <Stack spacing={4}>
                    {selectedPlan.Sections?.map((section: any) => (
                      <Box key={section.Id}>
                        <Typography variant="overline" sx={{ fontWeight: 800, color: 'primary.main', mb: 1, display: 'block' }}>
                          {section.Title}
                        </Typography>
                        <Stack spacing={1.5}>
                          {section.ControlDots?.map((dot: any) => (
                            <Paper key={dot.Id} variant="outlined" sx={{ 
                              p: 2, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 2,
                              transition: '0.2s', '&:hover': { borderColor: 'primary.main' }
                            }}>
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'Inter' }}>{dot.Title}</Typography>
                                <Typography variant="caption" color="text.secondary">Макс. балл: {dot.MaxBall}</Typography>
                              </Box>

                              <Stack direction="row" spacing={2} alignItems="center">
                                {/* Тип работы */}
                                <Select 
                                  size="small" 
                                  defaultValue="test" 
                                  sx={{ height: 35, fontSize: '0.8rem', borderRadius: 2, minWidth: 130 }}
                                >
                                  <MenuItem value="control">Контрольная</MenuItem>
                                  <MenuItem value="lab">Лабораторная</MenuItem>
                                  <MenuItem value="test">Тест</MenuItem>
                                  <MenuItem value="exam">Зачет/Экзамен</MenuItem>
                                </Select>

                                {/* Дедлайн */}
                                <TextField 
                                  type="date"
                                  size="small"
                                  defaultValue={dot.Date ? dot.Date.split('T')[0] : ""}
                                  sx={{ '& .MuiInputBase-input': { fontSize: '0.8rem', height: 18 } }}
                                />

                                <Chip 
                                  label={dot.Mark?.Ball ? `${dot.Mark.Ball} баллов` : "Нет оценки"} 
                                  color={dot.Mark?.Ball ? "success" : "default"}
                                  size="small"
                                  variant={dot.Mark?.Ball ? "filled" : "outlined"}
                                  sx={{ fontWeight: 600, minWidth: 80 }}
                                />
                              </Stack>
                            </Paper>
                          ))}
                        </Stack>
                      </Box>
                    ))}
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