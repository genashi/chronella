from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from .. import models, crud
from ..database import get_db
from ..auth_utils import get_current_user
from ..core.security import encrypt_password
from ..services.mrsu_auth import mrsu_service

router = APIRouter(
    prefix="/users",
    tags=["Users"],
)
# Pydantic схема для входных данных
class MRSULoginRequest(BaseModel):
    username: str
    password: str

@router.post("/link-mrsu")
async def link_mrsu_account(
    credentials: MRSULoginRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Вызываем наш сервис (он сам проверит пароль в вузе)
    result = await mrsu_service.authenticate(credentials.username, credentials.password)
    
    # 2. Если мы здесь, значит ошибок не было.
    # result содержит {"access_token": "...", "mrsu_user_data": {...}}
    
    # 3. Шифруем пароль для сохранения
    encrypted_pwd = encrypt_password(credentials.password)
    
    # 4. Обновляем пользователя в БД
    current_user.mrsu_username = credentials.username
    current_user.mrsu_password_encrypted = encrypted_pwd
    current_user.is_mrsu_verified = True
    
    # Можно сохранить ID студента, если он есть в ответе
    # current_user.student_id = str(result['mrsu_user_data'].get('Id', ''))

    db.commit()
    db.refresh(current_user)
    
    return {
        "status": "success",
        "message": "ЭИОС успешно подключена",
        "user_info": result['mrsu_user_data']
    }