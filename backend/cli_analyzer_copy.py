"""
Хронелла — консольный модуль аналитики
Реализует математику разделов 1.2, 1.3, 1.4 ВКР

Запуск: python analytics_console.py
"""

import math
import statistics
from datetime import datetime, timedelta

from app.database import SessionLocal
from app.models import Event, Discipline, ControlPoint


# =============================================================================
# РАЗДЕЛ 1.3 — Анализ нагрузки
# =============================================================================

# Коэффициенты трудоёмкости по типам событий (формула 16)
WORKLOAD_WEIGHTS = {
    'lecture':  1.0,
    'practice': 1.2,
    'lab':      1.2,
    'deadline': 2.0,
    'exam':     2.5,
    'control':  2.5,
    'custom':   1.0,
}

# Эмпирически подобранные пороги z-оценки для UI (раздел 1.3.3)
Z_WARN  = 1.0   # повышенная нагрузка
Z_CRIT  = 1.5   # критический перегруз

# Параметр сглаживания EWMA (формула 13)
EWMA_ALPHA = 0.3


def _build_daily_loads(events: list, week_start: datetime) -> dict:
    """
    Формирует словарь {дата_строка: взвешенная_нагрузка_в_часах}
    за 7 дней начиная с week_start.
    Реализует формулы (10) и (16).
    """
    daily = {
        (week_start + timedelta(days=i)).strftime('%Y-%m-%d'): 0.0
        for i in range(7)
    }

    for e in events:
        e_type  = e.get('type', 'custom') if isinstance(e, dict) else getattr(e, 'type', 'custom')
        e_start = e.get('start_at')       if isinstance(e, dict) else getattr(e, 'start_at', None)
        e_end   = e.get('end_at')         if isinstance(e, dict) else getattr(e, 'end_at',   None)

        if not e_start or not e_end:
            continue

        day = e_start.strftime('%Y-%m-%d')
        if day not in daily:
            continue

        duration = (e_end - e_start).total_seconds() / 3600
        weight   = WORKLOAD_WEIGHTS.get(e_type, 1.0)
        daily[day] += duration * weight

    return daily


def _ewma(series: list, alpha: float = EWMA_ALPHA) -> list:
    """
    Экспоненциально взвешенное скользящее среднее (формула 13).
    S_1 = L_1; S_j = alpha * L_j + (1 - alpha) * S_{j-1}
    """
    if not series:
        return []
    result = [series[0]]
    for val in series[1:]:
        result.append(alpha * val + (1 - alpha) * result[-1])
    return result


def _simple_ma(series: list, k: int) -> list:
    """
    Простое скользящее среднее порядка k (формула 11).
    Возвращает список той же длины; первые k-1 элементов = None.
    """
    result = [None] * (k - 1)
    for i in range(k - 1, len(series)):
        result.append(sum(series[i - k + 1: i + 1]) / k)
    return result


def analyze_workload(db, user_id: int, date_str: str):
    """
    Анализ нагрузки за неделю (разделы 1.3.1 – 1.3.5).
    """
    try:
        start = datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        print("Ошибка: неверный формат даты. Нужно YYYY-MM-DD.")
        return

    end = start + timedelta(days=7)

    # Получаем события расписания
    events = db.query(Event).filter(
        Event.user_id == user_id,
        Event.start_at >= start,
        Event.start_at < end
    ).all()

    payload = [
        {'type': e.type, 'start_at': e.start_at, 'end_at': e.end_at}
        for e in events
    ]

    # Дедлайны — условная продолжительность 2 часа (раздел 1.3.1)
    cps = db.query(ControlPoint).join(Discipline).filter(
        Discipline.user_id == user_id,
        ControlPoint.deadline >= start,
        ControlPoint.deadline < end
    ).all()

    for cp in cps:
        payload.append({
            'type':     'deadline',
            'start_at': cp.deadline - timedelta(hours=2),
            'end_at':   cp.deadline,
        })

    # Строим ряд нагрузки
    daily_loads = _build_daily_loads(payload, start)
    loads       = list(daily_loads.values())

    # Базовая статистика
    mean_load  = statistics.mean(loads)
    stdev_load = statistics.stdev(loads) if len(loads) > 1 else 0.0
    cv         = (stdev_load / mean_load * 100) if mean_load > 0 else 0.0

    # EWMA за эту неделю (формула 13)
    ewma_vals = _ewma(loads)

    # Вывод
    print("\n" + "=" * 58)
    print("[ АНАЛИЗ НАГРУЗКИ — раздел 1.3 ]")
    print(f"Период: {start.strftime('%d.%m.%Y')} — {(end - timedelta(days=1)).strftime('%d.%m.%Y')}")
    print(f"Учтено событий: {len(events)} пар | {len(cps)} дедлайнов")
    print("-" * 58)
    print(f"Средняя взвешенная нагрузка L̄ : {mean_load:.2f} ч/день")
    print(f"Стандартное отклонение σ       : {stdev_load:.2f} ч/день")

    # Коэффициент вариации (формула 15)
    if cv <= 60:
        cv_label = "равномерно ✓"
    elif cv <= 90:
        cv_label = "умеренная неравномерность ⚠️"
    else:
        cv_label = "существенная неравномерность ❗"
    print(f"Коэффициент вариации CV        : {cv:.1f}% — {cv_label}")

    print("-" * 58)
    print(f"{'День':<12} {'Нагр., ч':>9} {'EWMA':>7} {'Z-оценка':>9}  Статус")
    print("-" * 58)

    for i, (day, load) in enumerate(daily_loads.items()):
        z = (load - mean_load) / stdev_load if stdev_load > 0 else 0.0
        ewma_str = f"{ewma_vals[i]:.2f}" if ewma_vals[i] is not None else "  —  "

        if z >= Z_CRIT:
            status = "❗ КРИТ. ПЕРЕГРУЗ"
        elif z >= Z_WARN:
            status = "⚠️  повышенная"
        elif z <= -Z_WARN:
            status = "💤 отдых"
        else:
            status = "✓ норма"

        print(f"  {day}  {load:>6.2f}   {ewma_str:>6}   {z:>+6.2f}   {status}")

    print("=" * 58)


# =============================================================================
# РАЗДЕЛ 1.2 — Индекс активности
# =============================================================================

# Весовые коэффициенты (формула 6)
W1, W2, W3 = 0.3, 0.5, 0.2

# Шкала качественной интерпретации (раздел 1.2.5)
ACTIVITY_LEVELS = [
    (0.8, 1.01, "высокая вовлечённость, успеваемость в норме"),
    (0.6, 0.8,  "удовлетворительный уровень, небольшие отклонения"),
    (0.4, 0.6,  "низкая активность, системные проблемы"),
    (0.0, 0.4,  "критический уровень — зона риска"),
]


def _activity_level_label(index: float) -> str:
    for lo, hi, label in ACTIVITY_LEVELS:
        if lo <= index < hi:
            return label
    return "нет данных"


def _linear_regression_slope(series: list) -> float:
    """
    Коэффициент наклона β линейной регрессии (формула 9, МНК).
    β = Σ(t - t̄)(I_t - Ī) / Σ(t - t̄)²
    """
    n = len(series)
    if n < 2:
        return 0.0
    t_vals = list(range(1, n + 1))
    t_mean = sum(t_vals) / n
    i_mean = sum(series) / n
    num = sum((t_vals[j] - t_mean) * (series[j] - i_mean) for j in range(n))
    den = sum((t_vals[j] - t_mean) ** 2 for j in range(n))
    return num / den if den != 0 else 0.0


def analyze_performance(db, user_id: int, disc_id: int):
    """
    Индекс активности по дисциплине (разделы 1.2.1 – 1.2.5).
    """
    disc = db.query(Discipline).filter_by(id=disc_id, user_id=user_id).first()
    if not disc:
        print(f"Ошибка: дисциплина с ID {disc_id} не найдена.")
        return

    # --- Ap: посещаемость (формула 1) ---
    events     = db.query(Event).filter(Event.user_id == user_id, Event.eios_raw.isnot(None)).all()
    disc_events = [
        e for e in events
        if isinstance(e.eios_raw, dict) and str(e.eios_raw.get('Id')) == str(disc.mrsu_id)
    ]
    visited   = sum(1 for e in disc_events if e.is_visited is True)
    missed    = sum(1 for e in disc_events if e.is_visited is False)
    total_att = visited + missed
    ap        = visited / total_att if total_att > 0 else None

    # --- G: нормированная успеваемость (формулы 2–3) ---
    # Шкала вуза 0–100, gmin=0, gmax=100
    cps       = db.query(ControlPoint).filter(ControlPoint.discipline_id == disc.id).all()
    valid_cps = [cp for cp in cps if cp.type != 'exam']
    scored    = [cp for cp in valid_cps if cp.score is not None]

    if scored:
        gi_values = [cp.score / 100.0 for cp in scored]   # формула (2): (g - 0) / (100 - 0)
        g_norm    = sum(gi_values) / len(gi_values)        # формула (3): среднее по m точкам
    else:
        g_norm = None

    # Для отображения — просто сумма баллов
    current_score = sum(cp.score for cp in valid_cps if cp.score is not None)

    # --- Dp: своевременность (формула 4) ---
    total_dl = len(valid_cps)
    on_time  = sum(1 for cp in valid_cps if cp.is_late is False)
    dp       = on_time / total_dl if total_dl > 0 else None

    # --- Индекс активности (формула 5) ---
    # Если посещаемость недоступна — перераспределяем веса на G и Dp
    if ap is not None and g_norm is not None and dp is not None:
        index = W1 * ap + W2 * g_norm + W3 * dp
        weights_used = f"w1={W1}, w2={W2}, w3={W3}"
    elif g_norm is not None and dp is not None:
        # Нет пар в расписании — перераспределяем: 0.7 G + 0.3 Dp
        index = 0.7 * g_norm + 0.3 * dp
        weights_used = "пар нет → w2=0.7, w3=0.3"
    else:
        index = None
        weights_used = "недостаточно данных"

    print("\n" + "=" * 58)
    print(f"[ ИНДЕКС АКТИВНОСТИ — {disc.name} ]")
    print(f"  Весовые коэффициенты: {weights_used}")
    print("-" * 58)

    if total_att == 0:
        print(f"  Посещаемость Ap  : нет пар в расписании")
    else:
        ap_str = f"{visited}/{total_att} = {ap*100:.1f}%"
        print(f"  Посещаемость Ap  : {ap_str}")

    if g_norm is None:
        print(f"  Успеваемость G   : нет оценённых работ")
    else:
        print(f"  Успеваемость G   : {current_score:.1f} б  →  G = {g_norm:.3f}  ({g_norm*100:.1f}%)")

    if dp is None:
        print(f"  Своевременность Dp: нет назначенных заданий")
    else:
        dp_str = f"{on_time}/{total_dl} = {dp*100:.1f}%"
        print(f"  Своевременность Dp: {dp_str}")

    print("-" * 58)

    if index is not None:
        level = _activity_level_label(index)
        print(f"  ИНДЕКС АКТИВНОСТИ I = {index:.3f}  ({index*100:.1f}%)")
        print(f"  Уровень: {level}")
    else:
        print("  Индекс не может быть рассчитан — мало данных.")

    print("=" * 58)


# =============================================================================
# РАЗДЕЛ 1.4 — Корреляционный анализ
# =============================================================================

def _pearson(x: list, y: list) -> float:
    """Коэффициент корреляции Пирсона (формула 17)."""
    n = len(x)
    if n < 2:
        return 0.0
    mx, my = sum(x) / n, sum(y) / n
    num = sum((x[i] - mx) * (y[i] - my) for i in range(n))
    den = math.sqrt(
        sum((v - mx) ** 2 for v in x) *
        sum((v - my) ** 2 for v in y)
    )
    return round(num / den, 4) if den != 0 else 0.0


# Таблица критических значений t для alpha=0.05 (двусторонний)
_T_CRITICAL = {
    1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571,
    6: 2.447,  7: 2.365, 8: 2.306, 9: 2.262, 10: 2.228,
}


def _t_test(r: float, n: int) -> tuple:
    """
    t-критерий значимости корреляции (формула 20).
    Возвращает (t_stat, значима_ли_при_alpha=0.05).
    """
    if abs(r) >= 1.0 or n <= 2:
        return (float('inf'), True)
    t_stat  = r * math.sqrt(n - 2) / math.sqrt(1 - r ** 2)
    df      = n - 2
    t_crit  = _T_CRITICAL.get(df, 2.0)   # при df > 10 критическое ≈ 2.0
    return (round(t_stat, 3), abs(t_stat) > t_crit)


def _interpret_r(r: float) -> str:
    a    = abs(r)
    sign = "положительная" if r >= 0 else "отрицательная"
    if a >= 0.7:   strength = "сильная"
    elif a >= 0.5: strength = "умеренная"
    elif a >= 0.3: strength = "слабая"
    else:          return "незначимая"
    return f"{strength} {sign}"


def _ccf(x: list, y: list, max_lag: int = 3) -> list:
    """
    Кросс-корреляционная функция с временным лагом (формула 21).
    Возвращает список {'lag': l, 'r': r_xy(l)}.
    """
    n  = len(x)
    mx = sum(x) / n
    my = sum(y) / n
    den = math.sqrt(
        sum((v - mx) ** 2 for v in x) *
        sum((v - my) ** 2 for v in y)
    )
    results = []
    for lag in range(0, min(max_lag, n // 2) + 1):
        if n - lag < 2:
            break
        num = sum((x[t] - mx) * (y[t + lag] - my) for t in range(n - lag))
        r   = round(num / den, 4) if den != 0 else 0.0
        results.append({'lag': lag, 'r': r})
    return results


def _collect_weekly_series(db, user_id: int, weeks: int) -> tuple:
    """
    Собирает еженедельные ряды [Ap], [G], [Dp] за последние N недель.
    Недели без данных пропускаются.
    Возвращает (A_series, G_series, D_series, week_labels).
    """
    today      = datetime.now()
    week_start = (today - timedelta(days=today.weekday())) - timedelta(weeks=weeks - 1)

    A_series, G_series, D_series, labels = [], [], [], []

    for w in range(weeks):
        ws = week_start + timedelta(weeks=w)
        we = ws + timedelta(days=7)

        # Ap — посещаемость за неделю
        week_events = db.query(Event).filter(
            Event.user_id == user_id,
            Event.start_at >= ws,
            Event.start_at < we,
            Event.eios_raw.isnot(None)
        ).all()
        total   = len(week_events)
        visited = sum(1 for e in week_events if e.is_visited)
        ap      = (visited / total) if total > 0 else None

        # G — нормированная успеваемость накопленным итогом
        all_scored = db.query(ControlPoint).join(Discipline).filter(
            Discipline.user_id == user_id,
            ControlPoint.score.isnot(None),
            ControlPoint.type != 'exam'
        ).all()
        g_vals = [cp.score / 100.0 for cp in all_scored] if all_scored else None
        g      = sum(g_vals) / len(g_vals) if g_vals else None

        # Dp — своевременность дедлайнов за неделю
        week_cps = db.query(ControlPoint).join(Discipline).filter(
            Discipline.user_id == user_id,
            ControlPoint.deadline >= ws,
            ControlPoint.deadline < we
        ).all()
        assigned = len(week_cps)
        on_time  = sum(1 for cp in week_cps if cp.is_late is False)
        dp       = (on_time / assigned) if assigned > 0 else None

        if ap is not None and g is not None and dp is not None:
            A_series.append(ap)
            G_series.append(g)
            D_series.append(dp)
            labels.append(ws.strftime('%d.%m'))

    return A_series, G_series, D_series, labels


def analyze_correlation(db, user_id: int, weeks: int = 8):
    """
    Корреляционный анализ компонентов активности (раздел 1.4).
    Пирсон (17), матрица (19), t-тест (20), CCF (21).
    """
    A, G, D, labels = _collect_weekly_series(db, user_id, weeks)
    n = len(A)

    print("\n" + "=" * 58)
    print("[ КОРРЕЛЯЦИОННЫЙ АНАЛИЗ — раздел 1.4 ]")
    print(f"Запрошено недель: {weeks} | Периодов с полными данными: {n}")

    if n < 2:
        print("⚠️  Недостаточно данных для анализа.")
        print("=" * 58)
        return

    if n < 4:
        print("⚠️  Мало наблюдений (< 4) — результаты предварительные.")

    print(f"Учтённые недели: {', '.join(labels)}")
    print("-" * 58)

    # Корреляционная матрица (формула 19)
    r_ag = _pearson(A, G)
    r_ad = _pearson(A, D)
    r_dg = _pearson(D, G)

    print("[ МАТРИЦА КОРРЕЛЯЦИЙ R ]")
    print(f"  {'':14}  {'Ap':>7}  {'G':>7}  {'Dp':>7}")
    print(f"  {'Ap (посещ.)':14}  {'1.000':>7}  {r_ag:>7.3f}  {r_ad:>7.3f}")
    print(f"  {'G (успев.)':14}  {r_ag:>7.3f}  {'1.000':>7}  {r_dg:>7.3f}")
    print(f"  {'Dp (своевр.)':14}  {r_ad:>7.3f}  {r_dg:>7.3f}  {'1.000':>7}")

    print("\n[ ИНТЕРПРЕТАЦИЯ И ЗНАЧИМОСТЬ ]")
    pairs = [
        ("Ap ↔ G  (посещ. — успев.)", r_ag, A, G),
        ("Ap ↔ Dp (посещ. — своевр.)", r_ad, A, D),
        ("Dp ↔ G  (своевр. — успев.)", r_dg, D, G),
    ]

    for label, r, x_ser, y_ser in pairs:
        t_val, significant = _t_test(r, n)
        sig_str = "✓ значима (α=0.05)" if significant else "✗ не значима — нужно больше данных"
        print(f"\n  {label}")
        print(f"    r = {r:+.3f}  [{_interpret_r(r)}]")
        print(f"    t = {t_val},  {sig_str}")

    # Кросс-корреляция Ap → G с лагом (формула 21)
    print("\n[ КРОСС-КОРРЕЛЯЦИЯ: Ap → G (лаг в неделях) ]")
    ccf_vals = _ccf(A, G, max_lag=min(3, n // 2))

    if not ccf_vals:
        print("  Недостаточно данных для CCF.")
    else:
        best = max(ccf_vals, key=lambda x: abs(x['r']))
        for item in ccf_vals:
            bar   = "█" * int(abs(item['r']) * 20)
            arrow = " ← max" if item['lag'] == best['lag'] and len(ccf_vals) > 1 else ""
            print(f"  Лаг {item['lag']} нед.: r = {item['r']:+.3f}  {bar}{arrow}")

        if best['lag'] == 0:
            print("  → Связь мгновенная или данных мало для определения лага.")
        else:
            print(f"  → Эффект посещаемости на успеваемость: ~{best['lag']} нед.")

    print("=" * 58)


# =============================================================================
# РАЗДЕЛ 1.2.4 — Тренд индекса активности по неделям
# =============================================================================

def analyze_trend(db, user_id: int, weeks: int = 8):
    """
    Динамика индекса активности за N недель (раздел 1.2.4).
    Считает I_t для каждой недели и β линейной регрессии (формула 9).
    """
    today      = datetime.now()
    week_start = (today - timedelta(days=today.weekday())) - timedelta(weeks=weeks - 1)

    index_series = []
    labels       = []

    for w in range(weeks):
        ws = week_start + timedelta(weeks=w)
        we = ws + timedelta(days=7)

        # Ap
        week_events = db.query(Event).filter(
            Event.user_id == user_id,
            Event.start_at >= ws,
            Event.start_at < we,
            Event.eios_raw.isnot(None)
        ).all()
        total   = len(week_events)
        visited = sum(1 for e in week_events if e.is_visited)
        ap      = visited / total if total > 0 else None

        # G — накопленный итог
        scored = db.query(ControlPoint).join(Discipline).filter(
            Discipline.user_id == user_id,
            ControlPoint.score.isnot(None),
            ControlPoint.type != 'exam'
        ).all()
        g = sum(cp.score / 100.0 for cp in scored) / len(scored) if scored else None

        # Dp
        cps      = db.query(ControlPoint).join(Discipline).filter(
            Discipline.user_id == user_id,
            ControlPoint.deadline >= ws,
            ControlPoint.deadline < we
        ).all()
        assigned = len(cps)
        on_time  = sum(1 for cp in cps if cp.is_late is False)
        dp       = on_time / assigned if assigned > 0 else None

        if g is None:
            continue

        if ap is not None and dp is not None:
            idx = W1 * ap + W2 * g + W3 * dp
        elif dp is not None:
            idx = 0.7 * g + 0.3 * dp
        else:
            idx = g

        index_series.append(idx)
        labels.append(ws.strftime('%d.%m'))

    n = len(index_series)

    print("\n" + "=" * 58)
    print("[ ДИНАМИКА ИНДЕКСА АКТИВНОСТИ — раздел 1.2.4 ]")
    print(f"Периодов: {n}")

    if n < 2:
        print("⚠️  Недостаточно данных для анализа тренда.")
        print("=" * 58)
        return

    beta = _linear_regression_slope(index_series)

    # Спарклайн (мини-график в консоли)
    print("-" * 58)
    print("  Неделя  │  I_t   │ Уровень")
    print("  --------┼--------┼" + "-" * 30)
    for i, (label, val) in enumerate(zip(labels, index_series)):
        bar   = "▓" * int(val * 20)
        level = _activity_level_label(val)
        print(f"  {label:>7} │ {val:.3f} │ {bar}")

    print("-" * 58)

    if beta > 0.01:
        trend_str = f"↑ рост  (β = +{beta:.4f})"
    elif beta < -0.01:
        trend_str = f"↓ спад  (β = {beta:.4f})"
    else:
        trend_str = f"→ стабильно  (β ≈ {beta:.4f})"

    print(f"  Тренд: {trend_str}")
    print(f"  Последний I = {index_series[-1]:.3f} → {_activity_level_label(index_series[-1])}")
    print("=" * 58)


# =============================================================================
# ТОЧКА ВХОДА
# =============================================================================

def main():
    db      = SessionLocal()
    user_id = 1

    print("╔══════════════════════════════════════════╗")
    print("║   ХРОНЕЛЛА — Консольный модуль аналитики ║")
    print("╚══════════════════════════════════════════╝")

    menu = {
        "1": ("Анализ нагрузки за неделю        (1.3)", _menu_workload),
        "2": ("Индекс активности по дисциплине  (1.2)", _menu_performance),
        "3": ("Динамика индекса за N недель      (1.2.4)", _menu_trend),
        "4": ("Корреляционный анализ             (1.4)", _menu_correlation),
        "0": ("Выход", None),
    }

    while True:
        print("\nМеню:")
        for key, (label, _) in menu.items():
            print(f"  {key}. {label}")

        choice = input("\n> ").strip()

        if choice == "0":
            print("Завершение.")
            break
        elif choice in menu:
            _, handler = menu[choice]
            handler(db, user_id)
        else:
            print("Неверная команда.")

    db.close()


def _menu_workload(db, user_id):
    d = input("Дата начала недели YYYY-MM-DD [Enter → 2026-03-16]: ").strip() or "2026-03-16"
    analyze_workload(db, user_id, d)


def _menu_performance(db, user_id):
    d_id = input("ID дисциплины [Enter → 4]: ").strip() or "4"
    if d_id.isdigit():
        analyze_performance(db, user_id, int(d_id))
    else:
        print("ID должен быть числом.")


def _menu_trend(db, user_id):
    w = input("Количество недель [Enter → 8]: ").strip() or "8"
    if w.isdigit():
        analyze_trend(db, user_id, int(w))
    else:
        print("Введи число.")


def _menu_correlation(db, user_id):
    w = input("Количество недель [Enter → 8]: ").strip() or "8"
    if w.isdigit():
        analyze_correlation(db, user_id, int(w))
    else:
        print("Введи число.")


if __name__ == "__main__":
    main()