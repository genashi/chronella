import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Chip, Button,
  CircularProgress, Alert, ToggleButton, ToggleButtonGroup, Divider,
  IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Select, FormControl, InputLabel, Stack
} from '@mui/material';
import {
  CalendarMonth as CalendarIcon, Add as AddIcon, Sync as SyncIcon,
  Google as GoogleIcon, CheckCircle as VisitedIcon, Cancel as MissedIcon,
  ChevronLeft, ChevronRight, Edit as EditIcon, Delete as DeleteIcon,
} from '@mui/icons-material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/ru';
import AppLayout from '../components/AppLayout';

const API_URL = 'http://localhost:8000';
const DAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const DAYS_FULL = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

const TYPE_LABELS: Record<string, string> = {
  lecture: 'Лекция', practice: 'Практика', deadline: 'Дедлайн', exam: 'Зачёт/экзамен', custom: 'Личное',
};
const TYPE_COLORS: Record<string, string> = {
  lecture: 'var(--md-sys-color-primary-container)',
  practice: 'var(--md-sys-color-secondary-container)',
  deadline: 'var(--md-sys-color-error-container)',
  exam: 'var(--md-sys-color-error-container)',
  custom: 'var(--md-sys-color-surface-container-high)',
};

interface Event {
  id: number;
  title: string;
  type: string;
  start_at: string;
  end_at: string;
  location: string | null;
  teacher: string | null;
  is_visited: boolean | null;
  is_modified: boolean;
}

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
const toDateStr = (date: Date) => date.toISOString().split('T')[0];

function getWeekStart(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d;
}
function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

// ── Edit/Create Dialog ──────────────────────────────────────────────────────
interface EventDialogProps {
  open: boolean;
  event: Event | null; // null = создание
  onClose: () => void;
  onSave: (data: Partial<Event>) => void;
  onDelete?: (id: number) => void;
}

function EventDialog({ open, event, onClose, onSave, onDelete }: EventDialogProps) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('custom');
  const [location, setLocation] = useState('');
  const [teacher, setTeacher] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setType(event.type);
      setLocation(event.location || '');
      setTeacher(event.teacher || '');
      setStartAt(event.start_at.slice(0, 16));
      setEndAt(event.end_at.slice(0, 16));
    } else {
      setTitle(''); setType('custom'); setLocation('');
      setTeacher(''); setStartAt(''); setEndAt('');
    }
  }, [event, open]);

  const handleSave = () => {
    onSave({ title, type, location: location || null, teacher: teacher || null, start_at: startAt, end_at: endAt });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontFamily: 'Lora, serif', pb: 1 }}>
        {event ? 'Редактировать событие' : 'Добавить событие'}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Название" value={title} onChange={e => setTitle(e.target.value)}
            fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          <FormControl size="small" fullWidth>
            <InputLabel>Тип</InputLabel>
            <Select value={type} label="Тип" onChange={e => setType(e.target.value)}
              sx={{ borderRadius: 2 }}>
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <MenuItem key={k} value={k}>{v}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField label="Начало" type="datetime-local" value={startAt}
            onChange={e => setStartAt(e.target.value)} fullWidth size="small"
            InputLabelProps={{ shrink: true }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          <TextField label="Конец" type="datetime-local" value={endAt}
            onChange={e => setEndAt(e.target.value)} fullWidth size="small"
            InputLabelProps={{ shrink: true }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          <TextField label="Аудитория" value={location} onChange={e => setLocation(e.target.value)}
            fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          <TextField label="Преподаватель" value={teacher} onChange={e => setTeacher(e.target.value)}
            fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        {event && onDelete && (
          <Button color="error" onClick={() => onDelete(event.id)}
            sx={{ textTransform: 'none', fontFamily: 'Inter, sans-serif', mr: 'auto' }}>
            Удалить
          </Button>
        )}
        <Button onClick={onClose} sx={{ textTransform: 'none', fontFamily: 'Inter, sans-serif' }}>
          Отмена
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={!title || !startAt || !endAt}
          sx={{ textTransform: 'none', boxShadow: 'none', fontFamily: 'Inter, sans-serif', borderRadius: 2 }}>
          Сохранить
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Sync Dialog ──────────────────────────────────────────────────────────────
interface SyncDialogProps {
  open: boolean;
  onClose: () => void;
  onSync: (from: string, to: string) => void;
  syncing: boolean;
}

function SyncDialog({ open, onClose, onSync, syncing }: SyncDialogProps) {
  const [from, setFrom] = useState<Dayjs | null>(dayjs().startOf('week'));
  const [to, setTo] = useState<Dayjs | null>(dayjs().endOf('week'));

  const handleSync = () => {
    if (from && to) onSync(from.format('YYYY-MM-DD'), to.format('YYYY-MM-DD'));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontFamily: 'Lora, serif', pb: 1 }}>
        Загрузить из ЭИОС
      </DialogTitle>
      <DialogContent>
        <Typography sx={{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', color: 'text.secondary', mb: 2 }}>
          Выберите период для загрузки расписания
        </Typography>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ru">
          <Stack spacing={2}>
            <DatePicker label="С" value={from} onChange={setFrom}
              slotProps={{ textField: { size: 'small', fullWidth: true, sx: { '& .MuiOutlinedInput-root': { borderRadius: 2 } } } }} />
            <DatePicker label="По" value={to} onChange={setTo}
              slotProps={{ textField: { size: 'small', fullWidth: true, sx: { '& .MuiOutlinedInput-root': { borderRadius: 2 } } } }} />
          </Stack>
        </LocalizationProvider>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none', fontFamily: 'Inter, sans-serif' }}>
          Отмена
        </Button>
        <Button variant="contained" onClick={handleSync} disabled={!from || !to || syncing}
          startIcon={syncing ? <CircularProgress size={14} /> : <SyncIcon />}
          sx={{ textTransform: 'none', boxShadow: 'none', fontFamily: 'Inter, sans-serif', borderRadius: 2 }}>
          Загрузить
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── EventCard ────────────────────────────────────────────────────────────────
function EventCard({ event, onVisitToggle, onEdit }: {
  event: Event;
  onVisitToggle: (id: number, visited: boolean) => void;
  onEdit: (event: Event) => void;
}) {
  const borderColor = event.is_visited === true ? 'success.main'
    : event.is_visited === false ? 'error.main' : 'divider';

  return (
    <Card elevation={0} sx={{
      border: '1px solid', borderColor: 'divider', borderRadius: 3,
      borderLeft: '4px solid', borderLeftColor: borderColor, transition: 'border-color 0.2s',
      '&:hover .event-actions': { opacity: 1 },
    }}>
      <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontFamily: 'Inter, sans-serif' }}>
                {formatTime(event.start_at)}–{formatTime(event.end_at)}
              </Typography>
              <Chip label={TYPE_LABELS[event.type] || event.type} size="small" sx={{
                bgcolor: TYPE_COLORS[event.type] || 'var(--md-sys-color-surface-container)',
                fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', height: 20,
              }} />
              {event.is_modified && (
                <Chip label="изменено" size="small" sx={{
                  bgcolor: 'var(--md-sys-color-surface-container-high)',
                  fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', height: 20,
                }} />
              )}
            </Box>
            <Typography sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: '0.9rem' }}>
              {event.title}
            </Typography>
            {(event.teacher || event.location) && (
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontFamily: 'Inter, sans-serif', mt: 0.25 }}>
                {[event.teacher, event.location].filter(Boolean).join(' · ')}
              </Typography>
            )}
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {/* Редактировать */}
            <Tooltip title="Редактировать">
              <IconButton size="small" onClick={() => onEdit(event)}
                className="event-actions"
                sx={{ opacity: 0, transition: 'opacity 0.15s', color: 'text.secondary', p: 0.5 }}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {/* Посещаемость — только для учебных */}
            {event.type !== 'custom' && (
              <>
                <Tooltip title="Был(а)">
                  <IconButton size="small" onClick={() => onVisitToggle(event.id, true)}
                    sx={{ color: event.is_visited === true ? 'success.main' : 'action.disabled', p: 0.5 }}>
                    <VisitedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Пропустил(а)">
                  <IconButton size="small" onClick={() => onVisitToggle(event.id, false)}
                    sx={{ color: event.is_visited === false ? 'error.main' : 'action.disabled', p: 0.5 }}>
                    <MissedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function SchedulePage() {
  const [viewMode, setViewMode] = useState<'day' | 'week'>('week');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  const token = localStorage.getItem('access_token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const weekStart = getWeekStart(selectedDate);
  const weekDays = getWeekDays(weekStart);
  const todayStr = toDateStr(new Date());

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dateStr = toDateStr(selectedDate);
      const endpoint = viewMode === 'week'
        ? `${API_URL}/schedule/week?date=${dateStr}`
        : `${API_URL}/schedule/day?date=${dateStr}`;
      const res = await fetch(endpoint, { headers });
      if (!res.ok) throw new Error();
      setEvents(await res.json());
    } catch {
      setError('Не удалось загрузить расписание');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, viewMode]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  // Синхронизация по диапазону дат
  const handleSync = async (from: string, to: string) => {
    setSyncing(true);
    setSyncResult(null);
    setError(null);

    // Генерируем все даты в диапазоне
    const dates: string[] = [];
    const current = new Date(from);
    const end = new Date(to);
    while (current <= end) {
      dates.push(toDateStr(current));
      current.setDate(current.getDate() + 1);
    }

    let total = 0;
    try {
      // Синхронизируем по одному дню (бэк принимает date параметр)
      for (const date of dates) {
        const res = await fetch(`${API_URL}/schedule/sync/week?date=${date}`, {
          method: 'POST', headers,
        });
        if (res.ok) {
          const data = await res.json();
          total += data.synced;
        }
        // Небольшая пауза чтобы не флудить MRSU
        await new Promise(r => setTimeout(r, 200));
      }
      setSyncResult(`Загружено событий: ${total}`);
      setSyncDialogOpen(false);
      await loadEvents();
    } catch {
      setError('Ошибка при синхронизации');
    } finally {
      setSyncing(false);
    }
  };

  const handleVisitToggle = async (eventId: number, visited: boolean) => {
    try {
      const res = await fetch(`${API_URL}/schedule/${eventId}/visit`, {
        method: 'PATCH', headers, body: JSON.stringify({ is_visited: visited }),
      });
      if (!res.ok) return;
      const updated = await res.json();
      setEvents(prev => prev.map(e => e.id === eventId ? updated : e));
    } catch { /* silent */ }
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setEditDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingEvent(null);
    setEditDialogOpen(true);
  };

  const handleSaveEvent = async (data: Partial<Event>) => {
    try {
      if (editingEvent) {
        // Обновление через PATCH
        const res = await fetch(`${API_URL}/schedule/${editingEvent.id}`, {
          method: 'PATCH', headers, body: JSON.stringify(data),
        });
        if (res.ok) {
          const updated = await res.json();
          setEvents(prev => prev.map(e => e.id === editingEvent.id ? updated : e));
        }
      } else {
        // Создание нового
        const res = await fetch(`${API_URL}/schedule/custom`, {
          method: 'POST', headers, body: JSON.stringify(data),
        });
        if (res.ok) {
          await loadEvents();
        }
      }
    } catch { /* silent */ }
    setEditDialogOpen(false);
  };

  const handleDeleteEvent = async (id: number) => {
    try {
      const res = await fetch(`${API_URL}/schedule/${id}`, { method: 'DELETE', headers });
      if (res.ok) {
        setEvents(prev => prev.filter(e => e.id !== id));
        setEditDialogOpen(false);
      }
    } catch { /* silent */ }
  };

  const navigate = (dir: 1 | -1) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + dir * (viewMode === 'week' ? 7 : 1));
    setSelectedDate(d);
  };

  const eventsByDay = weekDays.map(day => ({
    date: day,
    dayStr: toDateStr(day),
    events: events.filter(e => e.start_at.startsWith(toDateStr(day))),
  }));

  const handleExportToGoogle = async () => {
    try {
        const res = await fetch(
            `${API_URL}/schedule/export/week?date=${toDateStr(selectedDate)}`,
            { method: 'POST', headers }
        );
        if (!res.ok) throw new Error();
        const data = await res.json();
        setSyncResult(`Экспортировано в Google: ${data.exported} событий`);
    } catch {
        setError('Ошибка экспорта в Google Calendar');
    }
  };

  const dayEvents = events.filter(e => e.start_at.startsWith(toDateStr(selectedDate)));

  return (
    <AppLayout>
      <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <CalendarIcon sx={{ color: 'primary.main', fontSize: 26 }} />
            <Typography variant="h5" sx={{ fontFamily: 'Lora, serif' }}>Расписание</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button startIcon={<SyncIcon />} variant="outlined" size="small"
              onClick={() => setSyncDialogOpen(true)}
              sx={{ borderRadius: 3, textTransform: 'none', fontFamily: 'Inter, sans-serif' }}>
              Загрузить из ЭИОС
            </Button>
            <Button startIcon={<AddIcon />} variant="outlined" size="small"
              onClick={handleAddNew}
              sx={{ borderRadius: 3, textTransform: 'none', fontFamily: 'Inter, sans-serif' }}>
              Добавить событие
            </Button>
            <Button startIcon={<GoogleIcon />} variant="contained" size="small"
              sx={{ borderRadius: 3, textTransform: 'none', boxShadow: 'none', fontFamily: 'Inter, sans-serif' }}>
              В Google Календарь
            </Button>
          </Box>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
        {syncResult && (
          <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setSyncResult(null)}>
            {syncResult}
          </Alert>
        )}

        {/* Mode + navigation */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <ToggleButtonGroup value={viewMode} exclusive onChange={(_, v) => v && setViewMode(v)} size="small"
            sx={{ '& .MuiToggleButton-root': { textTransform: 'none', fontFamily: 'Inter, sans-serif', px: 2 } }}>
            <ToggleButton value="day">День</ToggleButton>
            <ToggleButton value="week">Неделя</ToggleButton>
          </ToggleButtonGroup>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <IconButton size="small" onClick={() => navigate(-1)}><ChevronLeft /></IconButton>
            <Typography sx={{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', minWidth: 160, textAlign: 'center' }}>
              {viewMode === 'week'
                ? `${weekStart.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} – ${weekDays[6].toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}`
                : selectedDate.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Typography>
            <IconButton size="small" onClick={() => navigate(1)}><ChevronRight /></IconButton>
          </Box>
        </Box>

        {/* Day strip */}
        {viewMode === 'day' && (
          <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
            {weekDays.map((day, i) => {
              const dayStr = toDateStr(day);
              const isSelected = dayStr === toDateStr(selectedDate);
              const isToday = dayStr === todayStr;
              return (
                <Box key={i} onClick={() => setSelectedDate(new Date(day))} sx={{
                  flex: 1, textAlign: 'center', py: 1, borderRadius: 3, cursor: 'pointer',
                  bgcolor: isSelected ? 'var(--md-sys-color-primary-container)' : 'var(--md-sys-color-surface-container)',
                  border: '2px solid', borderColor: isToday ? 'primary.main' : 'transparent',
                  transition: 'all 0.15s', '&:hover': { bgcolor: 'var(--md-sys-color-secondary-container)' },
                }}>
                  <Typography sx={{ fontSize: '0.7rem', fontFamily: 'Inter, sans-serif', fontWeight: isSelected ? 700 : 400, color: isSelected ? 'var(--md-sys-color-on-primary-container)' : 'text.secondary' }}>
                    {DAYS_SHORT[i]}
                  </Typography>
                  <Typography sx={{ fontSize: '0.85rem', fontFamily: 'Inter, sans-serif', fontWeight: isSelected ? 700 : 400, color: isSelected ? 'var(--md-sys-color-on-primary-container)' : 'text.primary' }}>
                    {day.getDate()}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        )}

        {/* Content */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
        ) : viewMode === 'day' ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {dayEvents.length === 0
              ? <Typography sx={{ textAlign: 'center', py: 6, color: 'text.secondary', fontFamily: 'Inter, sans-serif' }}>
                  Пока ничего нет. Загрузите из расписание из ЭИОС или добавьте событие самостоятельно.
                </Typography>
              : dayEvents.map(e => <EventCard key={e.id} event={e} onVisitToggle={handleVisitToggle} onEdit={handleEdit} />)
            }
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            {eventsByDay.map(({ date, dayStr, events: dayEvs }, i) => {
              const isToday = dayStr === todayStr;
              return (
                <Box key={i}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.5, position: 'sticky', top: 0, bgcolor: 'background.default', zIndex: 1 }}>
                    <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: isToday ? 'primary.main' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Typography sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: isToday ? 'white' : 'text.primary' }}>
                        {date.getDate()}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ fontFamily: 'Inter, sans-serif', fontWeight: isToday ? 700 : 500, fontSize: '0.9rem', color: isToday ? 'primary.main' : 'text.primary', textTransform: 'capitalize' }}>
                        {DAYS_FULL[i]}
                      </Typography>
                      <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', fontFamily: 'Inter, sans-serif' }}>
                        {date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1 }} />
                    {dayEvs.length > 0 && (
                      <Chip label={`${dayEvs.length} зан.`} size="small" sx={{ bgcolor: 'var(--md-sys-color-surface-container)', fontFamily: 'Inter, sans-serif', fontSize: '0.65rem' }} />
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 1 }}>
                    {dayEvs.length === 0
                      ? <Typography sx={{ fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', color: 'text.disabled', pl: 1, pb: 1 }}>Занятий нет</Typography>
                      : dayEvs.map(e => <EventCard key={e.id} event={e} onVisitToggle={handleVisitToggle} onEdit={handleEdit} />)
                    }
                  </Box>
                  {i < 6 && <Divider sx={{ mb: 0.5 }} />}
                </Box>
              );
            })}
          </Box>
        )}
      </Box>

      {/* Dialogs */}
      <SyncDialog open={syncDialogOpen} onClose={() => setSyncDialogOpen(false)} onSync={handleSync} syncing={syncing} />
      <EventDialog open={editDialogOpen} event={editingEvent} onClose={() => setEditDialogOpen(false)} onSave={handleSaveEvent} onDelete={handleDeleteEvent} />
    </AppLayout>
  );
}