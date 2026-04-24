from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import httpx

from ..database import get_db
from ..auth_utils import get_current_user
from ..models import User, Discipline
from .schedule import get_fresh_mrsu_token

router = APIRouter(prefix="/performance", tags=["Performance"])

@router.get("/disciplines")
async def get_disciplines(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Сначала смотрим в нашей базе
    disciplines = db.query(Discipline).filter(Discipline.user_id == current_user.id).all()
    
    if not disciplines:
        token = await get_fresh_mrsu_token(current_user, db)
        async with httpx.AsyncClient(verify=False, timeout=20.0) as client:
            # Используем новый эндпоинт из документации
            url = "https://papi.mrsu.ru/v1/StudentSemester?selector=current"
            resp = await client.get(url, headers={"Authorization": f"Bearer {token}"})
            
            if resp.status_code == 200:
                data = resp.json()
                record_books = data.get("RecordBooks", [])
                
                new_items = []
                for book in record_books:
                    for d in book.get("Disciplines", []):
                        # Проверяем на Relevance (как просили в доках) и дубликаты
                        if d.get("Relevance") is not False:
                            mrsu_id = str(d.get("Id"))
                            
                            # Проверяем, нет ли уже такого в БД
                            exists = db.query(Discipline).filter_by(
                                user_id=current_user.id, 
                                mrsu_id=mrsu_id
                            ).first()
                            
                            if not exists:
                                new_discipline = Discipline(
                                    user_id=current_user.id,
                                    mrsu_id=mrsu_id,
                                    name=d.get("Title", "Без названия"),
                                    semester=str(d.get("PeriodInt", "1"))
                                )
                                db.add(new_discipline)
                                new_items.append(new_discipline)
                
                db.commit()
                # Возвращаем обновленный список из базы
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
        # Используем ID из МГУ для запроса плана
        url = f"https://papi.mrsu.ru/v1/StudentRatingPlan/{mrsu_id}"
        resp = await client.get(url, headers={"Authorization": f"Bearer {token}"})
        
        if resp.status_code == 200:
            return resp.json()  # Возвращаем объект с Sections и ControlDots
        raise HTTPException(status_code=resp.status_code, detail="Не удалось загрузить план")