import sys
from datetime import datetime, timedelta

from app.database import SessionLocal
from app.models import Event, Discipline, ControlPoint
from app.services.analytics import analyze_weekly_workload

def analyze_workload(db, user_id: int, date_str: str):
    try:
        start = datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        print("Ошибка: неверный формат даты. Нужно YYYY-MM-DD.")
        return

    end = start + timedelta(days=7)
    
    # Достаем события из расписания
    events = db.query(Event).filter(
        Event.user_id == user_id, 
        Event.start_at >= start, 
        Event.start_at < end
    ).all()
    
    payload = [{"type": e.type, "start_at": e.start_at, "end_at": e.end_at} for e in events]
    
    # Достаем дедлайны
    cps = db.query(ControlPoint).join(Discipline).filter(
        Discipline.user_id == user_id,
        ControlPoint.deadline >= start,
        ControlPoint.deadline < end
    ).all()
    
    for cp in cps:
        payload.append({
            "type": "deadline",
            "start_at": cp.deadline - timedelta(hours=2),
            "end_at": cp.deadline
        })
    
    res = analyze_weekly_workload(payload, date_str)
    
    print("\n" + "="*55)
    print(f"[ АНАЛИЗ НАГРУЗКИ (Математика по 1 главе) ]")
    print(f"Период: {start.strftime('%d.%m.%Y')} — {(end - timedelta(days=1)).strftime('%d.%m.%Y')}")
    print(f"Учтено пар: {len(events)} | Учтено дедлайнов: {len(cps)}")
    print("-" * 55)
    print(f"Средняя взвешенная нагрузка (L̄): {res['mean_load']} ч/день")
    print(f"Стандартное отклонение (σ):      {res['stdev_load']} ч/день")
    print(f"Индекс неравномерности (CV):     {res['cv']}%")
    print("-" * 55)
    print("[ Z-ОЦЕНКА ПО ДНЯМ ]")
    
    for d in res['daily_details']:
        z_str = f"{d['z_score']:+.2f}"
        if d['z_score'] >= 1.5:
            marker = "❗ КРИТ. ПЕРЕГРУЗ"
        elif d['z_score'] >= 1.0:
            marker = "⚠️ ВЫСОКАЯ НАГР."
        elif d['z_score'] <= -0.5:
            marker = "💤 отдых"
        else:
            marker = "✓ норма"
            
        print(f"  {d['day']} | Нагрузка: {d['load']:>5.2f} ч | Z = {z_str:>5} | {marker}")
        
    print("-" * 55)
    print("[ ВЫВОДЫ ]")
    for g in res['good']:
        print(f"  ✓ {g}")
    for imp in res['improve']:
        print(f"  ! {imp}")
    if not res['improve'] and not res['good']:
        print("  Данных недостаточно для анализа.")
    print("="*55)


def analyze_performance(db, user_id: int, disc_id: int):
    disc = db.query(Discipline).filter_by(id=disc_id, user_id=user_id).first()
    if not disc:
        print(f"Ошибка: Дисциплина с ID {disc_id} не найдена.")
        return

    # ПОСЕЩАЕМОСТЬ
    events = db.query(Event).filter(
        Event.user_id == user_id, 
        Event.eios_raw.isnot(None)
    ).all()
    
    disc_events = [e for e in events if isinstance(e.eios_raw, dict) and str(e.eios_raw.get("Id")) == str(disc.mrsu_id)]
    visited = sum(1 for e in disc_events if e.is_visited is True)
    missed = sum(1 for e in disc_events if e.is_visited is False)
    total_att = visited + missed

    # ОЦЕНКИ И ДЕДЛАЙНЫ
    cps = db.query(ControlPoint).filter(ControlPoint.discipline_id == disc.id).all()
    valid_cps = [cp for cp in cps if cp.type != "exam"]
    
    current_score = sum(cp.score for cp in valid_cps if cp.score is not None)
    total_dl = len(valid_cps)
    on_time = sum(1 for cp in valid_cps if cp.is_late is False)

    # МАТЕМАТИКА
    ap = (visited / total_att) if total_att > 0 else 0.0
    g_sem = min(current_score / 70.0, 1.0)
    dp = (on_time / total_dl) if total_dl > 0 else 1.0

    if total_att == 0:
        index = (0.7 * g_sem) + (0.3 * dp)
    else:
        index = (0.3 * ap) + (0.5 * g_sem) + (0.2 * dp)

    print("\n" + "="*55)
    print(f"[ УСПЕВАЕМОСТЬ: {disc.name} ]")
    print("-" * 55)
    
    if total_att == 0:
        print(f"Посещаемость: Нет пар в расписании (вес исключен)")
    else:
        print(f"Посещаемость: {visited}/{total_att} ({ap*100:.1f}%)")
        
    if total_dl == 0:
        print(f"Своевременность: Нет заданий (100%)")
    else:
        print(f"Своевременность: {on_time}/{total_dl} сдано в срок ({dp*100:.1f}%)")
        
    print(f"Баллы (глобально): {current_score:.1f} / 70 ({g_sem*100:.1f}%)")
    print("-" * 55)
    print(f"ИНДЕКС АКТИВНОСТИ (I): {index*100:.1f}%")
    print("="*55)


def main():
    db = SessionLocal()
    user_id = 1
    
    print("=== ТЕСТОВЫЙ АНАЛИЗАТОР ХРОНЕЛЛЫ ===")
    
    while True:
        print("\nЧто анализируем?")
        print("1. Нагрузку (Расписание)")
        print("2. Успеваемость (Дисциплина)")
        print("0. Выход")
        
        choice = input("> ")
        
        if choice == "1":
            d = input("Введи дату начала недели (YYYY-MM-DD) [Enter для 2026-03-16]: ")
            d = d.strip() or "2026-03-16"
            analyze_workload(db, user_id, d)
            
        elif choice == "2":
            d_id = input("Введи ID дисциплины [Enter для 4]: ")
            d_id = d_id.strip() or "4"
            if d_id.isdigit():
                analyze_performance(db, user_id, int(d_id))
            else:
                print("ID должен быть числом.")
                
        elif choice == "0":
            print("Завершение работы.")
            break
        else:
            print("Неверная команда.")

if __name__ == "__main__":
    main()