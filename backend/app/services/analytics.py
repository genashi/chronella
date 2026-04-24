# backend/app/services/analytics.py
from datetime import datetime
from ..models import Discipline, Event

def calculate_performance_metrics(discipline: Discipline, user_events: list[Event]):
    points = discipline.control_points
    if not points:
        return None

    # 1. Метрика успешности (S) = (Набранные баллы / Макс. возможные за прошедшие точки)
    total_current_score = sum(p.score for p in points if p.score is not None)
    # Считаем макс. балл только для тех точек, которые уже должны были пройти (дедлайн в прошлом) 
    # или по которым уже выставлена оценка
    past_max_score = sum(
        p.max_score for p in points 
        if (p.deadline and p.deadline < datetime.utcnow()) or (p.score is not None)
    )
    
    success_rate = (total_current_score / past_max_score) if past_max_score > 0 else 1.0

    # 2. Прогноз итогового балла (P_prog)
    total_possible_max = sum(p.max_score for p in points if p.max_score)
    projected_score = success_rate * total_possible_max

    # 3. Индекс активности (I_act) - на основе посещаемости занятий по этой дисциплине
    # Ищем события, в названии которых есть имя дисциплины
    rel_events = [e for e in user_events if discipline.name.lower() in e.title.lower()]
    visited = [e for e in rel_events if e.is_visited is True]
    
    attendance_rate = len(visited) / len(rel_events) if rel_events else 1.0
    
    # Итоговый статус (риск)
    status = "normal"
    if success_rate < 0.6 or attendance_rate < 0.5:
        status = "risk"
    if success_rate < 0.4:
        status = "danger"

    return {
        "success_rate": round(success_rate, 2),
        "current_score": total_current_score,
        "projected_score": round(projected_score, 1),
        "attendance_rate": round(attendance_rate, 2),
        "status": status,
        "total_max": total_possible_max
    }