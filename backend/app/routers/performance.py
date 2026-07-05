from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel
from typing import Optional
import httpx

from ..database import get_db
from ..auth_utils import get_current_user
from ..models import User, Discipline, ControlPoint, Event
from .schedule import get_fresh_mrsu_token
from datetime import timedelta

router = APIRouter(prefix="/performance", tags=["Performance"])

class ControlPointUpdate(BaseModel):
    type: Optional[str] = None
    deadline: Optional[str] = None
    is_late: Optional[bool] = None

@router.get("/disciplines")
async def get_disciplines(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    disciplines = db.query(Discipline).filter(Discipline.user_id == current_user.id).all()
    
    if not disciplines:
        token = await get_fresh_mrsu_token(current_user, db)
        async with httpx.AsyncClient(verify=False, timeout=20.0) as client:
            url = "https://papi.mrsu.ru/v1/StudentSemester?selector=current"
            resp = await client.get(url, headers={"Authorization": f"Bearer {token}"})
            
            if resp.status_code == 200:
                data = resp.json()
                record_books = data.get("RecordBooks", [])
                
                for book in record_books:
                    for d in book.get("Disciplines", []):
                        if d.get("Relevance") is not False:
                            mrsu_id = str(d.get("Id"))
                            
                            exists = db.query(Discipline).filter_by(
                                user_id=current_user.id, 
                                mrsu_id=int(mrsu_id)
                            ).first()
                            
                            if not exists:
                                new_discipline = Discipline(
                                    user_id=current_user.id,
                                    mrsu_id=int(mrsu_id),
                                    name=d.get("Title", "Без названия"),
                                    semester=str(d.get("PeriodInt", "1"))
                                )
                                db.add(new_discipline)
                
                db.commit()
                disciplines = db.query(Discipline).filter(Discipline.user_id == current_user.id).all()
            else:
                raise HTTPException(
                    status_code=resp.status_code, 
                    detail=f"Ошибка API МГУ (StudentSemester): {resp.text}"
                )

    return disciplines

@router.get("/discipline/{mrsu_id}/plan")
async def get_discipline_plan(
    mrsu_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    token = await get_fresh_mrsu_token(current_user, db)
    async with httpx.AsyncClient(verify=False, timeout=15.0) as client:
        url = f"https://papi.mrsu.ru/v1/StudentRatingPlan/{mrsu_id}"
        resp = await client.get(url, headers={"Authorization": f"Bearer {token}"})
        
        if resp.status_code == 200:
            plan_data = resp.json()
            
            try:
                discipline = db.query(Discipline).filter(
                    Discipline.user_id == current_user.id,
                    Discipline.mrsu_id == int(mrsu_id)
                ).first()

                if discipline:
                    existing_cps = db.query(ControlPoint).filter_by(discipline_id=discipline.id).all()
                    
                    # --- НАКОПИТЕЛЬНЫЙ СЧЕТЧИК БАЛЛОВ ---
                    cumulative_sum = 0.0

                    for section in plan_data.get("Sections", []):
                        for dot in section.get("ControlDots", []):
                            title = dot.get("Title", "Без названия")
                            dot_id = dot.get("Id")
                            
                            cp = next((c for c in existing_cps if isinstance(c.eios_raw, dict) and c.eios_raw.get("Id") == dot_id), None)

                            score = dot.get("Mark", {}).get("Ball") if dot.get("Mark") else None
                            max_score = dot.get("MaxBall") or 0.0

                            if not cp:
                                # Логика отсечения: всё, что идет ПОСЛЕ накопленных 70 баллов — это экзамен.
                                # Округляем до 1 знака, чтобы избежать багов с плавающей точкой (например, 69.9999)
                                if round(cumulative_sum, 1) >= 70.0:
                                    default_type = "exam"
                                else:
                                    default_type = "lab"
                                    
                                cp = ControlPoint(
                                    discipline_id=discipline.id,
                                    title=title,
                                    type=default_type,
                                    deadline=None,
                                    score=score,
                                    max_score=max_score,
                                    is_late=True,
                                    eios_raw=dot
                                )
                                db.add(cp)
                                existing_cps.append(cp)
                            else:
                                cp.score = score
                                cp.max_score = max_score
                                cp.eios_raw = dot
                            
                            # Прибавляем баллы ТЕКУЩЕЙ точки к сумме для проверки СЛЕДУЮЩИХ точек
                            cumulative_sum += max_score
                            
                            db.commit()
                            db.refresh(cp)

                            dot["db_id"] = cp.id
                            dot["custom_type"] = cp.type
                            dot["custom_deadline"] = cp.deadline.strftime("%Y-%m-%d") if cp.deadline else ""
                            dot["custom_is_late"] = cp.is_late
            except Exception as e:
                print(f"Ошибка сохранения контрольных точек в БД: {e}")

            return plan_data
            
        raise HTTPException(status_code=resp.status_code, detail="Не удалось загрузить план")

@router.patch("/control-points/{cp_id}")
async def update_control_point(
    cp_id: int,
    data: ControlPointUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cp = db.query(ControlPoint).join(Discipline).filter(
        ControlPoint.id == cp_id,
        Discipline.user_id == current_user.id
    ).first()

    if not cp:
        raise HTTPException(status_code=404, detail="Контрольная точка не найдена")

    if data.type is not None:
        cp.type = data.type
        
    if data.deadline is not None:
        event_title = f"Дедлайн: {cp.title}"
        if data.deadline == "":
            cp.deadline = None
            db.query(Event).filter(Event.user_id == current_user.id, Event.title == event_title).delete()
        else:
            cp.deadline = datetime.strptime(data.deadline, "%Y-%m-%d")
            eff_start = datetime.combine(cp.deadline.date(), datetime.min.time())
            eff_end = eff_start + timedelta(minutes=30)
            
            existing_event = db.query(Event).filter_by(user_id=current_user.id, title=event_title).first()
            if existing_event:
                existing_event.start_at = eff_start
                existing_event.end_at = eff_end
            else:
                new_event = Event(
                    user_id=current_user.id,
                    title=event_title,
                    type="deadline",
                    start_at=eff_start,
                    end_at=eff_end,
                    is_modified=True
                )
                db.add(new_event)
                
    if data.is_late is not None:
        cp.is_late = data.is_late

    db.commit()
    return {"status": "ok"}

@router.get("/discipline/{mrsu_id}/analytics")
async def get_discipline_analytics(
    mrsu_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    disc = db.query(Discipline).filter(
        Discipline.mrsu_id == int(mrsu_id), 
        Discipline.user_id == current_user.id
    ).first()
    
    if not disc:
        raise HTTPException(status_code=404, detail="Дисциплина не найдена")

    # 1. Посещаемость (Ap)
    events = db.query(Event).filter(Event.user_id == current_user.id, Event.eios_raw.isnot(None)).all()
    disc_events = [e for e in events if isinstance(e.eios_raw, dict) and str(e.eios_raw.get('Id')) == str(disc.mrsu_id)]
    visited = sum(1 for e in disc_events if e.is_visited is True)
    missed = sum(1 for e in disc_events if e.is_visited is False)
    total_att = visited + missed
    ap = visited / total_att if total_att > 0 else None

    # 2. Успеваемость (G) — ИСПРАВЛЕНО
    cps = db.query(ControlPoint).filter(ControlPoint.discipline_id == disc.id).all()
    valid_cps = [cp for cp in cps if cp.type != 'exam']
    
    current_score = sum(cp.score for cp in valid_cps if cp.score is not None)
    # Накопительная система до 70 баллов
    g_norm = min(current_score / 70.0, 1.0)

    # 3. Своевременность (Dp)
    total_dl = len(valid_cps)
    on_time = sum(1 for cp in valid_cps if cp.is_late is False)
    dp = on_time / total_dl if total_dl > 0 else None

    # 4. Индекс активности (I)
    W1, W2, W3 = 0.3, 0.5, 0.2
    if ap is not None and dp is not None:
        index = W1 * ap + W2 * g_norm + W3 * dp
        weights_used = "w1=0.3, w2=0.5, w3=0.2"
    elif dp is not None:
        index = 0.7 * g_norm + 0.3 * dp
        weights_used = "пар нет → w2=0.7, w3=0.3"
    else:
        index = g_norm
        weights_used = "только оценки"

    level = "нет данных"
    if index is not None:
        if index >= 0.8: level = "высокая вовлечённость, успеваемость в норме"
        elif index >= 0.6: level = "удовлетворительный уровень, небольшие отклонения"
        elif index >= 0.4: level = "низкая активность, системные проблемы"
        else: level = "критический уровень — зона риска"

    return {
        "ap": ap,
        "g_norm": g_norm,
        "dp": dp,
        "index": index,
        "level": level,
        "weights_used": weights_used,
        "visited": visited,
        "total_att": total_att,
        "on_time": on_time,
        "total_dl": total_dl,
        "current_score": current_score
    }