import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Chip, Button,
  CircularProgress, Alert, ToggleButton, ToggleButtonGroup, Divider,
  IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Select, FormControl, InputLabel, Stack, Grid
} from '@mui/material';
import {
  CalendarMonth as CalendarIcon, Add as AddIcon, Sync as SyncIcon,
  Google as GoogleIcon, CheckCircle as VisitedIcon, Cancel as MissedIcon,
  ChevronLeft, ChevronRight, Edit as EditIcon, Warning as WarningIcon
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
  lecture: 'Лекция',
  practice: 'Практика',
  deadline: 'Дедлайн',
  exam: 'Зачёт/экзамен',
  custom: 'Личное',
};

const TYPE_COLORS: Record<string, string> = {
  lecture: 'var(--md-sys-color-primary-container)',
  practice: 'var(--md-sys-color-secondary-container)',
  lab: 'var(--md-sys-color-tertiary-container)',
  deadline: 'var(--md-sys-color-error-container)',
  exam: 'var(--md-sys-color-error-container)',
  custom: 'var(--md-sys-color-surface-container-high)',
};

const getTypeLabel = (type: string | null) => {
  if (!type) return 'Тип не указан';
  return TYPE_LABELS[type] ?? type;
};

interface Event {
  id: number;
  title: string;
  type: string | null;
  start_at: string;
  end_at: string;
  location: string | null;
  teacher: string | null;
  is_visited: boolean | null;
  is_modified: boolean;
}

interface AnalyticsData {
  mean_load: number;
  cv: number;
  good: string[];
  improve: string[];
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

function dayjsWeekStart(d: Dayjs): Dayjs {
  const dow = d.day();
  return d.subtract(dow === 0 ? 6 : dow - 1, 'day').startOf('day');
}
function dayjsWeekEnd(d: Dayjs): Dayjs {
  return dayjsWeekStart(d).add(6, 'day').endOf('day');
}

interface EventDialogProps {
  open: boolean;
  event: Event | null;
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
      setType(event.type || 'custom');
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
    onSave({
      title, type,
      location: location || null,
      teacher: teacher || null,
      start_at: startAt,
      end_at: endAt,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontFamily: 'EB Garamond, serif', pb: 1 }}>
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

interface SyncDialogProps {
  open: boolean;
  onClose: () => void;
  onSync: (from: string, to: string) => void;
  syncing: boolean;
}

function SyncDialog({ open, onClose, onSync, syncing }: SyncDialogProps) {
  const [from, setFrom] = useState<Dayjs | null>(dayjsWeekStart(dayjs()));
  const [to, setTo] = useState<Dayjs | null>(dayjsWeekEnd(dayjs()));

  const handleSync = () => {
    if (from && to) onSync(from.format('YYYY-MM-DD'), to.format('YYYY-MM-DD'));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontFamily: 'EB Garamond, serif', pb: 1 }}>
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

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  onExport: (from: string, to: string, types: string[]) => void;
  currentDate: Date;
}

function ExportDialog({ open, onClose, onExport, currentDate }: ExportDialogProps) {
  const [from, setFrom] = useState<Dayjs | null>(dayjsWeekStart(dayjs(currentDate)));
  const [to, setTo] = useState<Dayjs | null>(dayjsWeekEnd(dayjs(currentDate)));
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    ['lecture', 'practice', 'lab', 'exam', 'deadline', 'custom']
  );

  const toggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontFamily: 'EB Garamond, serif' }}>
        Экспорт в Google Календарь
      </DialogTitle>
      <DialogContent>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ru">
          <Stack spacing={2} sx={{ mt: 1 }}>
            <DatePicker label="С" value={from} onChange={setFrom}
              slotProps={{ textField: { size: 'small', fullWidth: true } }} />
            <DatePicker label="По" value={to} onChange={setTo}
              slotProps={{ textField: { size: 'small', fullWidth: true } }} />
            <Typography sx={{ fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', color: 'text.secondary' }}>
              Типы событий:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <Chip
                  key={k}
                  label={v}
                  onClick={() => toggleType(k)}
                  variant={selectedTypes.includes(k) ? 'filled' : 'outlined'}
                  sx={{
                    bgcolor: selectedTypes.includes(k) ? TYPE_COLORS[k] : 'transparent',
                    fontFamily: 'Inter, sans-serif',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </Box>
          </Stack>
        </LocalizationProvider>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none', fontFamily: 'Inter, sans-serif' }}>
          Отмена
        </Button>
        <Button
          variant="contained"
          startIcon={<GoogleIcon />}
          onClick={() => from && to && onExport(from.format('YYYY-MM-DD'), to.format('YYYY-MM-DD'), selectedTypes)}
          disabled={!from || !to || selectedTypes.length === 0}
          sx={{ textTransform: 'none', boxShadow: 'none', borderRadius: 2, fontFamily: 'Inter, sans-serif' }}
        >
          Экспортировать
        </Button>
      </DialogActions>
    </Dialog>
  );
}

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
              <Chip label={getTypeLabel(event.type)} size="small" sx={{
                bgcolor: TYPE_COLORS[event.type || 'custom'] || 'var(--md-sys-color-surface-container)',
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
            <Tooltip title="Редактировать">
              <IconButton size="small" onClick={() => onEdit(event)}
                className="event-actions"
                sx={{ opacity: 0, transition: 'opacity 0.15s', color: 'text.secondary', p: 0.5 }}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
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

function WorkloadAnalysis({ data }: { data: AnalyticsData | null }) {
  if (!data || (data.good.length === 0 && data.improve.length === 0)) return null;

  return (
    <Card elevation={0} sx={{
      border: '1px solid', borderColor: 'divider', borderRadius: 3,
      bgcolor: 'var(--md-sys-color-surface-container-lowest)'
    }}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontFamily: 'EB Garamond, serif', mb: 2 }}>
          Анализ загруженности
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Box>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontFamily: 'Inter' }}>Нагрузка</Typography>
            <Typography sx={{ fontFamily: 'Inter', fontWeight: 600 }}>{data.mean_load} ч/дн</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontFamily: 'Inter' }}>Неравномерность</Typography>
            <Typography sx={{ fontFamily: 'Inter', fontWeight: 600 }}>{data.cv}%</Typography>
          </Box>
        </Box>

        {data.good.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: 'success.main', mb: 1, fontFamily: 'Inter' }}>Хорошо</Typography>
            {data.good.map((text, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 1, mb: 0.5, alignItems: 'flex-start' }}>
                <VisitedIcon color="success" sx={{ fontSize: 16, mt: 0.2 }} />
                <Typography sx={{ fontSize: '0.85rem', fontFamily: 'Inter' }}>{text}</Typography>
              </Box>
            ))}
          </Box>
        )}

        {data.improve.length > 0 && (
          <Box>
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: 'error.main', mb: 1, fontFamily: 'Inter' }}>Исправить</Typography>
            {data.improve.map((text, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 1, mb: 0.5, alignItems: 'flex-start' }}>
                <WarningIcon color="error" sx={{ fontSize: 16, mt: 0.2 }} />
                <Typography sx={{ fontSize: '0.85rem', fontFamily: 'Inter' }}>{text}</Typography>
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default function SchedulePage() {
  const [viewMode, setViewMode] = useState<'day' | 'week'>('week');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [analysisData, setAnalysisData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

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

      if (viewMode === 'week') {
        const resAnalytics = await fetch(`${API_URL}/schedule/analytics/week?date=${dateStr}`, { headers });
        if (resAnalytics.ok) {
          setAnalysisData(await resAnalytics.json());
        } else {
          setAnalysisData(null);
        }
      }
    } catch {
      setError('Не удалось загрузить расписание');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, viewMode]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const handleSync = async (from: string, to: string) => {
    setSyncing(true);
    setSyncResult(null);
    setError(null);
    try {
      const res = await fetch(
        `${API_URL}/schedule/sync/range?date_from=${from}&date_to=${to}`,
        { method: 'POST', headers }
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSyncResult(`Загружено событий: ${data.synced}`);
      setSyncDialogOpen(false);
      await loadEvents();
    } catch {
      setError('Ошибка при синхронизации');
    } finally {
      setSyncing(false);
    } 
  };

  const handleExportToGoogle = async (dateFrom: string, dateTo: string, types: string[]) => {
    try {
      const params = new URLSearchParams({
        date_from: dateFrom,
        date_to: dateTo,
        types: types.join(','),
      });
      const res = await fetch(`${API_URL}/schedule/export?${params}`, {
        method: 'POST', headers,
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSyncResult(`Экспортировано в Google: ${data.exported} событий`);
      setExportDialogOpen(false);
    } catch {
      setError('Ошибка экспорта в Google Calendar');
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
        const res = await fetch(`${API_URL}/schedule/${editingEvent.id}`, {
          method: 'PATCH', headers, body: JSON.stringify(data),
        });
        if (res.ok) {
          const updated = await res.json();
          const updatedEvent = Array.isArray(updated) ? updated[0] : updated;
          setEvents(prev => prev.map(e => e.id === editingEvent.id ? updatedEvent : e));
        }
      } else {
        const res = await fetch(`${API_URL}/schedule/custom`, {
          method: 'POST', headers, body: JSON.stringify(data),
        });
        if (res.ok) await loadEvents();
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

  const dayEvents = events.filter(e => e.start_at.startsWith(toDateStr(selectedDate)));

  return (
    <AppLayout>
      <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
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
            <Button
              startIcon={<GoogleIcon />}
              variant="contained"
              size="small"
              onClick={() => setExportDialogOpen(true)}
              sx={{ borderRadius: 3, textTransform: 'none', boxShadow: 'none', fontFamily: 'Inter, sans-serif' }}
            >
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

        <Grid container spacing={3}>
          <Grid item xs={12} md={viewMode === 'week' ? 8 : 12}>
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

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
            ) : viewMode === 'day' ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {dayEvents.length === 0
                  ? <Typography sx={{ textAlign: 'center', py: 6, color: 'text.secondary', fontFamily: 'Inter, sans-serif' }}>
                      Пока ничего нет. Загрузите расписание из ЭИОС или добавьте событие самостоятельно.
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
          </Grid>

          {viewMode === 'week' && (
            <Grid item xs={12} md={4}>
              <Box sx={{ position: 'sticky', top: 16 }}>
                <WorkloadAnalysis data={analysisData} />
              </Box>
            </Grid>
          )}
        </Grid>
      </Box>

      <SyncDialog open={syncDialogOpen} onClose={() => setSyncDialogOpen(false)} onSync={handleSync} syncing={syncing} />
      <EventDialog open={editDialogOpen} event={editingEvent} onClose={() => setEditDialogOpen(false)} onSave={handleSaveEvent} onDelete={handleDeleteEvent} />
      <ExportDialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)} onExport={handleExportToGoogle} currentDate={selectedDate} />
    </AppLayout>
  );
}