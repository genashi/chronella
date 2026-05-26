import statistics
from datetime import datetime, timedelta

def analyze_weekly_workload(events, week_start_str: str):
    # Коэффициенты трудоемкости (Формула 16)
    weights = {'lecture': 1.0, 'practice': 1.2, 'lab': 1.2, 'deadline': 2.0, 'exam': 2.5, 'control': 2.5, 'custom': 1.0}
    
    start_dt = datetime.strptime(week_start_str, "%Y-%m-%d")
    # Инициализация всех 7 дней для корректного расчета среднего и CV
    daily_loads = {(start_dt + timedelta(days=i)).strftime('%Y-%m-%d'): 0.0 for i in range(7)}
    
    for event in events:
        e_type = event.type if hasattr(event, 'type') else event.get('type', 'custom')
        e_start = event.start_at if hasattr(event, 'start_at') else event.get('start_at')
        e_end = event.end_at if hasattr(event, 'end_at') else event.get('end_at')
        
        if not e_start or not e_end:
            continue
            
        day = e_start.strftime('%Y-%m-%d')
        if day in daily_loads:
            duration = (e_end - e_start).total_seconds() / 3600
            weight = weights.get(e_type, 1.0)
            daily_loads[day] += duration * weight

    loads_only = list(daily_loads.values())
    
    # Статистические метрики
    mean_load = statistics.mean(loads_only)
    stdev_load = statistics.stdev(loads_only) if len(loads_only) > 1 else 0
    cv = (stdev_load / mean_load * 100) if mean_load > 0 else 0
    
    good, improve = [], []
    daily_details = []

    # Анализ порогов CV (Адаптировано для N=7)
    if cv <= 60:
        good.append(f"Нагрузка распределена отлично (CV = {cv:.1f}% ≤ 60%).")
    elif cv <= 90:
        improve.append(f"Умеренная неравномерность (CV = {cv:.1f}%). Можно сгладить пики.")
    else:
        improve.append(f"Сильная неравномерность (CV = {cv:.1f}% > 90%). График слишком скачкообразный.")

    # Z-анализ для каждого дня (Адаптировано для N=7)
    for day, load in daily_loads.items():
        z_score = (load - mean_load) / stdev_load if stdev_load > 0 else 0
        
        daily_details.append({
            "day": day,
            "load": round(load, 2),
            "z_score": round(z_score, 2)
        })
        
        if z_score >= 1.5:
            improve.append(f"Критический перегруз {day} (Z ≥ +1.5).")
        elif z_score >= 1.0:
            improve.append(f"Повышенная нагрузка {day} (Z ≥ +1.0).")
    
    if not improve:
        good.append("Критических перекосов в расписании нет.")

    return {
        "mean_load": round(mean_load, 2),
        "stdev_load": round(stdev_load, 2),
        "cv": round(cv, 2),
        "daily_details": daily_details,
        "good": good,
        "improve": improve
    }