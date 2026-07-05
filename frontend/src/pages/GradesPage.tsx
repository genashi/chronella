import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, Divider, Skeleton, Stack, LinearProgress,
  MenuItem, Select, TextField, Paper, Checkbox, FormControlLabel,
  CardContent, Button, CircularProgress
} from '@mui/material';
import { School as GradesIcon, AssignmentOutlined, Assessment as AssessmentIcon } from '@mui/icons-material';
import AppLayout from '../components/AppLayout';

const API_URL = 'http://localhost:8000';

// ─── Карточка аналитики ────────────────────────────────────────────────────

function PerformanceAnalysis({
  data, loading, onAnalyze
}: {
  data: any, loading: boolean, onAnalyze: () => void
}) {
  const indexColor = (val: number | null) => {
    if (val === null) return 'text.secondary';
    if (val >= 0.8) return 'success.main';
    if (val >= 0.6) return 'warning.main';
    return 'error.main';
  };

  const metrics = data ? [
    {
      label: 'Посещаемость',
      hint: data.total_att > 0 ? `${data.visited} из ${data.total_att} занятий` : 'Нет данных о парах',
      value: data.ap !== null ? `${(data.ap * 100).toFixed(0)}%` : '—',
      color: indexColor(data.ap),
    },
    {
      label: 'Успеваемость',
      hint: data.current_score > 0 ? `${data.current_score} баллов набрано` : 'Нет оценок',
      value: data.g_norm !== null ? `${(data.g_norm * 100).toFixed(0)}%` : '—',
      color: indexColor(data.g_norm),
    },
    {
      label: 'Дедлайны',
      hint: data.total_dl > 0 ? `${data.on_time} из ${data.total_dl} сдано в срок` : 'Нет заданий',
      value: data.dp !== null ? `${(data.dp * 100).toFixed(0)}%` : '—',
      color: indexColor(data.dp),
    },
  ] : [];

  return (
    <Card elevation={0} sx={{
      border: '1px solid', borderColor: 'divider', borderRadius: 3,
      bgcolor: 'var(--md-sys-color-surface-container-lowest)',
      minHeight: 200, display: 'flex', flexDirection: 'column',
    }}>
      <CardContent sx={{ p: 3, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" sx={{ fontFamily: 'EB Garamond, serif', mb: 0.5 }}>
          Анализ активности
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Inter', mb: 2, fontSize: '0.8rem' }}>
          Посещаемость, успеваемость и соблюдение дедлайнов
        </Typography>

        {!data && !loading && (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1.5, py: 2 }}>
            <AssessmentIcon sx={{ fontSize: 36, color: 'text.disabled' }} />
            <Typography align="center" sx={{ fontSize: '0.82rem', color: 'text.secondary', fontFamily: 'Inter', maxWidth: 260, lineHeight: 1.6 }}>
              Рассчитает вашу вовлечённость по этой дисциплине на основе посещаемости, оценок и дедлайнов.
            </Typography>
            <Button variant="contained" startIcon={<AssessmentIcon />} onClick={onAnalyze}
              sx={{ borderRadius: 2, textTransform: 'none', fontFamily: 'Inter', boxShadow: 'none', mt: 0.5 }}>
              Провести анализ
            </Button>
          </Box>
        )}

        {loading && (
          <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', py: 3 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {data && !loading && (
          <>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mb: 2.5 }}>
              {metrics.map(m => (
                <Box key={m.label} sx={{ bgcolor: 'var(--md-sys-color-surface-container)', borderRadius: 2, p: 1.5 }}>
                  <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', fontFamily: 'Inter', mb: 0.5 }}>
                    {m.label}
                  </Typography>
                  <Typography sx={{ fontSize: '1.2rem', fontFamily: 'Inter', fontWeight: 600, color: m.color }}>
                    {m.value}
                  </Typography>
                  <Typography sx={{ fontSize: '0.68rem', color: 'text.disabled', fontFamily: 'Inter', mt: 0.25, lineHeight: 1.3 }}>
                    {m.hint}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Divider sx={{ mb: 2 }} />

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontFamily: 'Inter', mb: 0.5 }}>
                  Общий индекс активности
                </Typography>
                <Typography sx={{ fontSize: '0.72rem', color: 'text.disabled', fontFamily: 'Inter', lineHeight: 1.5 }}>
                  {data.level}
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ fontFamily: 'Inter', fontWeight: 800, color: indexColor(data.index), flexShrink: 0 }}>
                {data.index !== null ? `${(data.index * 100).toFixed(0)}%` : '—'}
              </Typography>
            </Box>

            <Button fullWidth variant="outlined" size="small" onClick={onAnalyze}
              sx={{ mt: 2, borderRadius: 2, textTransform: 'none', fontFamily: 'Inter' }}>
              Обновить расчёт
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Карточка контрольной точки ───────────────────────────────────────────

function ControlDotCard({ dot, onUpdate }: { dot: any, onUpdate: (id: number, field: string, val: any) => void }) {
  const hasMark = dot.Mark?.Ball > 0;
  const markPct = hasMark ? Math.round((dot.Mark.Ball / dot.MaxBall) * 100) : null;
  const markColor = markPct === null ? 'text.disabled'
    : markPct >= 80 ? 'success.main'
    : markPct >= 60 ? 'warning.main'
    : 'error.main';

  return (
    <Paper variant="outlined" sx={{
      borderRadius: 3, overflow: 'hidden',
      transition: '0.15s', '&:hover': { borderColor: 'primary.light' }
    }}>
      {/* Верх: название + балл */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, pt: 2, pb: 1.5 }}>
        <Typography sx={{ fontFamily: 'Inter', fontWeight: 600, fontSize: '0.9rem', lineHeight: 1.3, flex: 1, minWidth: 0, mr: 2 }}>
          {dot.Title}
        </Typography>
        <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
          <Typography sx={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '1.15rem', color: markColor, lineHeight: 1 }}>
            {hasMark ? dot.Mark.Ball : '—'}
            <Typography component="span" sx={{ fontFamily: 'Inter', fontWeight: 400, fontSize: '0.78rem', color: 'text.disabled', ml: 0.5 }}>
              / {dot.MaxBall}
            </Typography>
          </Typography>
          {hasMark && (
            <Typography sx={{ fontSize: '0.68rem', color: markColor, fontFamily: 'Inter', mt: 0.25 }}>
              {markPct}% от максимума
            </Typography>
          )}
        </Box>
      </Box>

      {/* Низ: контролы */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1.5,
        px: 2.5, py: 1.25,
        bgcolor: 'var(--md-sys-color-surface-container)',
        borderTop: '1px solid', borderColor: 'divider'
      }}>
        <Select
          size="small"
          defaultValue={dot.custom_type || 'lab'}
          onChange={(e) => onUpdate(dot.db_id, 'type', e.target.value)}
          sx={{ height: 32, fontSize: '0.78rem', borderRadius: 2, minWidth: 130 }}
        >
          <MenuItem value="control">Контрольная</MenuItem>
          <MenuItem value="lab">Лабораторная</MenuItem>
          <MenuItem value="test">Тест</MenuItem>
          <MenuItem value="exam">Зачёт / Экзамен</MenuItem>
        </Select>

        <TextField
          type="date"
          size="small"
          label="Дедлайн"
          InputLabelProps={{ shrink: true }}
          defaultValue={dot.custom_deadline || ''}
          onChange={(e) => onUpdate(dot.db_id, 'deadline', e.target.value)}
          sx={{ '& .MuiInputBase-input': { fontSize: '0.78rem', height: 16 }, width: 148 }}
        />

        <FormControlLabel
          control={
            <Checkbox
              size="small"
              defaultChecked={dot.custom_is_late === false}
              onChange={(e) => onUpdate(dot.db_id, 'is_late', !e.target.checked)}
            />
          }
          label={
            <Typography sx={{ fontSize: '0.78rem', fontFamily: 'Inter', color: 'text.secondary' }}>
              Сдано вовремя
            </Typography>
          }
          sx={{ mr: 0 }}
        />
      </Box>
    </Paper>
  );
}

// ─── Блок итоговой аттестации ─────────────────────────────────────────────

function ExamBlock({ dots, onUpdate }: { dots: any[], onUpdate: (id: number, field: string, val: any) => void }) {
  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
      {/* Шапка с датой — одна на весь блок */}
      <Box sx={{
        px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        bgcolor: 'var(--md-sys-color-surface-container)',
        borderBottom: '1px solid', borderColor: 'divider'
      }}>
        <Typography sx={{
          fontSize: '0.72rem', fontWeight: 600, fontFamily: 'Inter',
          color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.6px'
        }}>
          Итоговая аттестация
        </Typography>
        <TextField
          type="date"
          size="small"
          label="Дата проведения"
          InputLabelProps={{ shrink: true }}
          defaultValue={dots[0]?.custom_deadline || ''}
          onChange={(e) => dots.forEach(dot => onUpdate(dot.db_id, 'deadline', e.target.value))}
          sx={{ '& .MuiInputBase-input': { fontSize: '0.78rem', height: 16 }, width: 175 }}
        />
      </Box>

      {/* Точки */}
      <Stack spacing={0} divider={<Divider />}>
        {dots.map((dot: any) => {
          const hasMark = dot.Mark?.Ball > 0;
          const markPct = hasMark ? Math.round((dot.Mark.Ball / dot.MaxBall) * 100) : null;
          const markColor = markPct === null ? 'text.disabled'
            : markPct >= 80 ? 'success.main'
            : markPct >= 60 ? 'warning.main'
            : 'error.main';

          return (
            <Box key={dot.Id} sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ flex: 1, minWidth: 0, mr: 2 }}>
                <Typography sx={{ fontFamily: 'Inter', fontWeight: 600, fontSize: '0.9rem', lineHeight: 1.3 }}>
                  {dot.Title}
                </Typography>
                <Typography sx={{ fontSize: '0.72rem', color: 'text.disabled', fontFamily: 'Inter', mt: 0.25 }}>
                  Максимум: {dot.MaxBall} б.
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                <Typography sx={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '1.15rem', color: markColor, lineHeight: 1 }}>
                  {hasMark ? dot.Mark.Ball : '—'}
                  <Typography component="span" sx={{ fontFamily: 'Inter', fontWeight: 400, fontSize: '0.78rem', color: 'text.disabled', ml: 0.5 }}>
                    / {dot.MaxBall}
                  </Typography>
                </Typography>
                {hasMark && (
                  <Typography sx={{ fontSize: '0.68rem', color: markColor, fontFamily: 'Inter', mt: 0.25 }}>
                    {markPct}% от максимума
                  </Typography>
                )}
              </Box>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}

// ─── Главная страница ──────────────────────────────────────────────────────

export default function GradesPage() {
  const [disciplines, setDisciplines] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const pointColor = (pts: number) => {
    if (pts < 40) return '#B3261E';
    if (pts < 61) return '#F9A825';
    return '#2E7D32';
  };

  useEffect(() => { fetchDisciplines(); }, []);

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
    } catch (e) { console.error(e); }
    finally { setLoadingList(false); }
  };

  const loadAnalytics = async (mrsu_id: string) => {
    setLoadingAnalytics(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/performance/discipline/${mrsu_id}/analytics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setAnalyticsData(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoadingAnalytics(false); }
  };

  const triggerAnalyze = () => {
    const d = disciplines.find(d => d.id === selectedId);
    if (d) loadAnalytics(d.mrsu_id);
  };

  const handleSelect = async (discipline: any) => {
    setSelectedId(discipline.id);
    setLoadingPlan(true);
    setAnalyticsData(null);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/performance/discipline/${discipline.mrsu_id}/plan`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setSelectedPlan(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoadingPlan(false); }
  };

  const handleUpdateDot = async (dbId: number, field: string, value: any) => {
    try {
      const token = localStorage.getItem('access_token');
      await fetch(`${API_URL}/performance/control-points/${dbId}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });
      if (analyticsData) triggerAnalyze();
    } catch (e) { console.error(e); }
  };

  const totalPoints = selectedPlan?.Sections?.reduce((acc: number, sec: any) =>
    acc + (sec.ControlDots?.reduce((s: number, d: any) => s + (d.Mark?.Ball || 0), 0) ?? 0), 0
  ) ?? 0;

  return (
    <AppLayout>
      <Box sx={{ p: { xs: 2, md: 4 }, flex: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>

        {/* Заголовок страницы */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
          <GradesIcon sx={{ color: 'primary.main', fontSize: 28 }} />
          <Typography variant="h4" sx={{ fontFamily: 'Lora, serif' }}>Успеваемость</Typography>
        </Box>

        {/* Двухколоночный layout */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, flex: 1, alignItems: 'flex-start' }}>

          {/* ── Левая колонка: список дисциплин ── */}
          <Box sx={{ width: { xs: '100%', md: 360 }, flexShrink: 0 }}>
            <Typography sx={{
              fontFamily: 'Inter', fontWeight: 700, fontSize: '0.7rem',
              color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.8px',
              px: 0.5, mb: 1.5, display: 'block'
            }}>
              Дисциплины
            </Typography>

            <Stack spacing={1}>
              {loadingList
                ? [1, 2, 3, 4].map(i => (
                    <Skeleton key={i} variant="rectangular" height={48} sx={{ borderRadius: 3 }} />
                  ))
                : disciplines.map(d => {
                    const isSelected = selectedId === d.id;

                    return (
                      <Card
                        key={d.id}
                        elevation={0}
                        onClick={() => handleSelect(d)}
                        sx={{
                          border: '1px solid',
                          borderColor: isSelected ? 'primary.main' : 'divider',
                          borderRadius: 3, cursor: 'pointer',
                          bgcolor: isSelected
                            ? 'var(--md-sys-color-primary-container)'
                            : 'var(--md-sys-color-surface-container-lowest)',
                          transition: '0.15s',
                          '&:hover': { borderColor: 'primary.light' }
                        }}
                      >
                        <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
                          <Typography sx={{
                            fontFamily: 'Inter', fontWeight: 600, fontSize: '0.85rem',
                            lineHeight: 1.3,
                            color: isSelected ? 'primary.main' : 'text.primary'
                          }}>
                            {d.name}
                          </Typography>
                        </CardContent>
                      </Card>
                    );
                  })
              }
            </Stack>
          </Box>

          {/* ── Правая часть: детали дисциплины ── */}
          <Box sx={{ flex: 1, maxWidth: { md: 760 }, width: '100%', minWidth: 0 }}>
            {loadingPlan ? (
              <Stack spacing={2}>
                <Skeleton variant="rectangular" height={88} sx={{ borderRadius: 3 }} />
                <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 3 }} />
                <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 3 }} />
              </Stack>
            ) : selectedPlan ? (
              <Stack spacing={3}>

                {/* Шапка: название + прогресс баллов */}
                <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
                  <Box sx={{ px: 3, pt: 2.5, pb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                      <Typography variant="h6" sx={{ fontFamily: 'Lora', fontWeight: 600, lineHeight: 1.3, maxWidth: '65%' }}>
                        {disciplines.find(d => d.id === selectedId)?.name}
                      </Typography>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography sx={{ fontFamily: 'Inter', fontWeight: 800, fontSize: '1.6rem', color: pointColor(totalPoints), lineHeight: 1 }}>
                          {totalPoints.toFixed(1)}
                          <Typography component="span" sx={{ fontFamily: 'Inter', fontWeight: 400, fontSize: '0.85rem', color: 'text.disabled', ml: 0.75 }}>
                            / 100
                          </Typography>
                        </Typography>
                        <Typography sx={{ fontSize: '0.7rem', color: 'text.disabled', fontFamily: 'Inter', mt: 0.25 }}>
                          баллов набрано
                        </Typography>
                      </Box>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(totalPoints, 100)}
                      sx={{
                        height: 6, borderRadius: 4, bgcolor: 'rgba(0,0,0,0.06)',
                        '& .MuiLinearProgress-bar': { bgcolor: pointColor(totalPoints) }
                      }}
                    />
                  </Box>
                </Card>

                {/* Карточка аналитики */}
                <PerformanceAnalysis
                  data={analyticsData}
                  loading={loadingAnalytics}
                  onAnalyze={triggerAnalyze}
                />

                {/* Секции с контрольными точками */}
                {selectedPlan.Sections?.map((section: any) => {
                  const regularDots = section.ControlDots?.filter((d: any) => d.custom_type !== 'exam') ?? [];
                  const examDots    = section.ControlDots?.filter((d: any) => d.custom_type === 'exam')  ?? [];

                  return (
                    <Box key={section.Id}>
                      {regularDots.length > 0 && (
                        <Box sx={{ mb: examDots.length > 0 ? 2 : 0 }}>
                          {/* Заголовок секции */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                            <Box sx={{ width: 3, height: 14, bgcolor: 'primary.main', borderRadius: 4, flexShrink: 0 }} />
                            <Typography sx={{
                              fontFamily: 'Inter', fontWeight: 600, fontSize: '0.78rem',
                              color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.5px'
                            }}>
                              {section.Title}
                            </Typography>
                          </Box>

                          <Stack spacing={1.5}>
                            {regularDots.map((dot: any) => (
                              <ControlDotCard key={dot.Id} dot={dot} onUpdate={handleUpdateDot} />
                            ))}
                          </Stack>
                        </Box>
                      )}

                      {examDots.length > 0 && (
                        <ExamBlock dots={examDots} onUpdate={handleUpdateDot} />
                      )}
                    </Box>
                  );
                })}
              </Stack>
            ) : (
              <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 500, opacity: 0.5 }}>
                <AssignmentOutlined sx={{ fontSize: 56, mb: 2, color: 'text.secondary' }} />
                <Typography variant="h6" sx={{ fontFamily: 'EB Garamond, serif', mb: 0.5 }}>
                  Выберите дисциплину
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'Inter', color: 'text.secondary' }}>
                  Оценки, дедлайны и аналитика активности
                </Typography>
              </Stack>
            )}
          </Box>

        </Box>
      </Box>
    </AppLayout>
  );
}