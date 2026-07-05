from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import httpx

from ..services.google_calendar import get_google_service, ensure_chronella_calendar, upsert_event
from ..database import get_db
from ..auth_utils import get_current_user
from ..models import User, Event, ControlPoint, Discipline
from ..schemas import EventOut, EventVisitUpdate, EventCreate
from ..core.security import decrypt_password
from ..services.mrsu_auth import mrsu_service#, upsert_event, get_google_service, ensure_chronella_calendar,
from ..services.google_calendar import (
    get_google_service, 
    ensure_chronella_calendar, 
    upsert_event, 
    delete_event
)
from app.services.analytics import analyze_weekly_workload
from google.auth.exceptions import RefreshError

router = APIRouter(prefix="/schedule", tags=["Schedule"])

LESSON_TIMES = {
    1: ("08:00", "09:30"),
    2: ("09:45", "11:15"),
    3: ("11:35", "13:05"),
    4: ("13:20", "14:50"),
    5: ("15:00", "16:30"),
    6: ("16:40", "18:10"),
    7: ("18:15", "19:45"),
    8: ("19:50", "21:20"),
}

LESSON_TYPE_MAP = {
    0: None,
    1: "practice",
    2: "lab",
}


def parse_lesson_time(date_str: str, lesson_number: int) -> tuple[datetime, datetime]:
    date = datetime.fromisoformat(date_str).date()
    times = LESSON_TIMES.get(lesson_number, ("08:00", "09:35"))
    start = datetime.combine(date, datetime.strptime(times[0], "%H:%M").time())
    end = datetime.combine(date, datetime.strptime(times[1], "%H:%M").time())
    return start, end


async def get_fresh_mrsu_token(user: User, db: Session) -> str:
    now = datetime.utcnow()
    if user.mrsu_access_token and user.mrsu_token_expires_at and user.mrsu_token_expires_at > now:
        return user.mrsu_access_token

    password = decrypt_password(user.mrsu_password_encrypted)
    auth = await mrsu_service.authenticate(user.mrsu_username, password)
    token = auth["access_token"]

    user.mrsu_access_token = token
    user.mrsu_token_expires_at = now + timedelta(seconds=7199)
    db.commit()
    return token


async def sync_single_date(date_str: str, user: User, db: Session, token: str) -> int:
    print(f"=== SYNC DATE: {date_str} ===")

    async with httpx.AsyncClient(verify=False, timeout=30.0) as client:
            response = await client.get(
                "https://papi.mrsu.ru/v2/StudentTimeTable",
                params={"date": date_str},
                headers={"Authorization": f"Bearer {token}"}
            )

    print(f"Status: {response.status_code}")
    print(f"Response: {response.text[:500]}")
    
    """Синхронизирует расписание на одну дату. Возвращает количество добавленных/обновлённых событий."""
    async with httpx.AsyncClient(verify=False, timeout=30.0) as client:
        response = await client.get(
            "https://papi.mrsu.ru/v1/StudentTimeTable",  # v1 вместо v2
            params={"date": date_str},
            headers={"Authorization": f"Bearer {token}"}
        )

    if response.status_code != 200:
        print(f"MRSU skip {date_str}: status {response.status_code}")
        return 0

    data = response.json()
    print(f"MRSU timetable raw: {data}")  

    # API возвращает массив — берём первый элемент
    if isinstance(data, list):
        if not data:
            return 0
        data = data[0]

    timetable = data.get("TimeTable", {})
    lessons = timetable.get("Lessons", [])
    date_str_from_api = timetable.get("Date", date_str)

    synced = 0
    for lesson in lessons:
        number = lesson.get("Number", 1)
        start_at, end_at = parse_lesson_time(date_str_from_api, number)

        for discipline in lesson.get("Disciplines", []):
            disc_id = discipline.get("Id")

            # Ищем существующее событие по времени начала + id дисциплины
            existing = db.query(Event).filter(
                Event.user_id == user.id,
                Event.start_at == start_at,
            ).filter(
                Event.eios_raw.isnot(None)
            ).first()

            # Если студент редактировал вручную — не трогаем
            if existing and existing.is_modified:
                continue

            teacher = discipline.get("Teacher") or {}
            auditorium = discipline.get("Auditorium") or {}

            aud_number = auditorium.get("Number", "")
            aud_campus = auditorium.get("CampusTitle", "")
            fio = teacher.get("FIO", "")
            location = f"{aud_number} (к. {aud_campus})" if aud_number else None

            event_data = dict(
                user_id=user.id,
                title=(discipline.get("Title") or "Занятие").strip(),
                type=LESSON_TYPE_MAP.get(discipline.get("LessonType"), None),
                start_at=start_at,
                end_at=end_at,
                location=location,
                teacher=fio.title() if fio else None,
                is_modified=False,
                eios_raw=discipline,
            )

            if existing:
                for k, v in event_data.items():
                    setattr(existing, k, v)
            else:
                db.add(Event(**event_data))

            synced += 1

    db.commit()
    return synced

@router.get("/analytics/week")
def get_week_analytics(
    date: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        target_date = datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD")

    # Ищем понедельник (начало недели) для переданной даты
    week_start = target_date - timedelta(days=target_date.weekday())
    week_end = week_start + timedelta(days=7)
    week_start_str = week_start.strftime("%Y-%m-%d")

    # 1. Собираем пары/события из расписания
    events = db.query(Event).filter(
        Event.user_id == current_user.id,
        Event.start_at >= week_start,
        Event.start_at < week_end
    ).all()

    payload = [{"type": e.type, "start_at": e.start_at, "end_at": e.end_at} for e in events]

    # 2. Собираем дедлайны по контрольным точкам
    cps = db.query(ControlPoint).join(Discipline).filter(
        Discipline.user_id == current_user.id,
        ControlPoint.deadline >= week_start,
        ControlPoint.deadline < week_end
    ).all()

    for cp in cps:
        # Эмулируем 2 часа нагрузки на дедлайн
        payload.append({
            "type": "deadline",
            "start_at": cp.deadline - timedelta(hours=2),
            "end_at": cp.deadline
        })

    # 3. Передаем собранный payload и строку начала недели в сервис аналитики
    analysis = analyze_weekly_workload(payload, week_start_str)
    return analysis

@router.patch("/{event_id}", response_model=list[EventOut])
def update_event(
    event_id: int,
    data: dict,
    bulk: bool = Query(False),
    date_from: str = Query(None),
    date_to: str = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.user_id == current_user.id
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    allowed = {"title", "type", "start_at", "end_at", "location", "teacher", "description"}

    if bulk and event.eios_raw:
        # Находим все похожие события: та же дисциплина + тот же номер пары + тот же день недели
        disc_id = event.eios_raw.get("Id")
        lesson_number = LESSON_TIMES.get(  # номер пары по времени начала
            next((k for k, v in LESSON_TIMES.items()
                  if datetime.strptime(v[0], "%H:%M").time() == event.start_at.time()), None)
        )
        weekday = event.start_at.weekday()

        query = db.query(Event).filter(
            Event.user_id == current_user.id,
            Event.eios_raw.isnot(None),
        )
        if date_from:
            query = query.filter(Event.start_at >= datetime.strptime(date_from, "%Y-%m-%d"))
        if date_to:
            query = query.filter(Event.start_at <= datetime.strptime(date_to, "%Y-%m-%d"))

        target_events = [
            e for e in query.all()
            if e.eios_raw.get("Id") == disc_id
            and e.start_at.weekday() == weekday
            and e.start_at.time() == event.start_at.time()
        ]
    else:
        target_events = [event]

    for e in target_events:
        for k, v in data.items():
            if k in allowed:
                if k in ("start_at", "end_at") and isinstance(v, str):
                    v = datetime.fromisoformat(v)
                setattr(e, k, v)
        e.is_modified = True

    db.commit()
    return target_events

@router.post("/sync/week")
async def sync_week(
    date: str = Query(..., description="Любой день недели, формат YYYY-MM-DD"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Синхронизирует расписание на всю неделю (пн–сб)."""
    if not current_user.is_mrsu_verified:
        raise HTTPException(status_code=400, detail="MRSU account not linked")

    token = await get_fresh_mrsu_token(current_user, db)

    day = datetime.strptime(date, "%Y-%m-%d")
    week_start = day - timedelta(days=day.weekday())  # понедельник

    total = 0
    for i in range(6):  # пн–сб
        day_str = (week_start + timedelta(days=i)).strftime("%Y-%m-%d")
        total += await sync_single_date(day_str, current_user, db, token)

    return {"synced": total, "week_start": week_start.strftime("%Y-%m-%d")}

@router.post("/sync/range")
async def sync_range(
    date_from: str = Query(...),
    date_to: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_mrsu_verified:
        raise HTTPException(status_code=400, detail="MRSU account not linked")

    token = await get_fresh_mrsu_token(current_user, db)

    start = datetime.strptime(date_from, "%Y-%m-%d")
    end = datetime.strptime(date_to, "%Y-%m-%d")

    total = 0
    current = start
    while current <= end:
        day_str = current.strftime("%Y-%m-%d")
        total += await sync_single_date(day_str, current_user, db, token)
        current += timedelta(days=1)

    return {"synced": total}

@router.get("/week", response_model=list[EventOut])
def get_week_schedule(
    date: str = Query(..., description="Любой день недели, формат YYYY-MM-DD"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Возвращает все события на неделю сгруппированные по дням."""
    day = datetime.strptime(date, "%Y-%m-%d")
    week_start = day - timedelta(days=day.weekday())
    week_end = week_start + timedelta(days=7)

    events = db.query(Event).filter(
        Event.user_id == current_user.id,
        Event.start_at >= week_start,
        Event.start_at < week_end
    ).order_by(Event.start_at).all()

    return events


@router.get("/day", response_model=list[EventOut])
def get_day_schedule(
    date: str = Query(..., description="Дата, формат YYYY-MM-DD"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Возвращает все события на конкретный день."""
    day = datetime.strptime(date, "%Y-%m-%d")
    day_end = day + timedelta(days=1)

    events = db.query(Event).filter(
        Event.user_id == current_user.id,
        Event.start_at >= day,
        Event.start_at < day_end
    ).order_by(Event.start_at).all()

    return events


@router.patch("/{event_id}/visit", response_model=EventOut)
def mark_visit(
    event_id: int,
    data: EventVisitUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.user_id == current_user.id
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    event.is_visited = data.is_visited
    db.commit()
    db.refresh(event)
    return event


@router.post("/custom", response_model=EventOut)
def create_custom_event(
    data: EventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    event = Event(
        user_id=current_user.id,
        title=data.title,
        type=data.type,
        start_at=data.start_at,
        end_at=data.end_at,
        location=data.location,
        description=data.description,
        is_modified=True,
        eios_raw=None,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.delete("/{event_id}")
def delete_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.user_id == current_user.id
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    db.delete(event)
    db.commit()
    return {"ok": True}

@router.post("/export")
async def export_to_google(
    date_from: str = Query(...),
    date_to: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.google_refresh_token:
        raise HTTPException(status_code=400, detail="Google not linked")

    start = datetime.strptime(date_from, "%Y-%m-%d")
    end = datetime.strptime(date_to, "%Y-%m-%d") + timedelta(days=1)

    events = db.query(Event).filter(
        Event.user_id == current_user.id,
        Event.start_at >= start,
        Event.start_at < end
    ).all()

    try:
        service = get_google_service(current_user)
        calendar_id = current_user.google_calendar_id
        
        if not calendar_id:
            calendar_id = ensure_chronella_calendar(service)
            current_user.google_calendar_id = calendar_id
            db.commit()

        exported = 0
        for event in events:
            try:
                gid = upsert_event(service, calendar_id, event, event.google_event_id)
                event.google_event_id = gid
                exported += 1
            except Exception as e:
                print(f"Export error {event.id}: {e}")

        db.commit()
        return {"exported": exported}

    except RefreshError:
        current_user.is_google_verified = False
        current_user.google_refresh_token = None
        db.commit()
        raise HTTPException(status_code=401, detail="Google token expired or revoked. Please relink.")
    except Exception as e:
        print(f"Google Calendar Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to export to Google Calendar")