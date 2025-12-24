from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ..models import User
from .. import models, crud
from ..database import get_db
from ..auth_utils import get_current_user
from ..core.security import encrypt_password
from ..services.mrsu_auth import mrsu_service

router = APIRouter(
    prefix="/auth",
    tags=["Users"],
)
# Pydantic схема для входных данных
class MRSULoginRequest(BaseModel):
    username: str
    password: str

@router.post("/link-mrsu")
async def link_mrsu_account(
    credentials: MRSULoginRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Пытаемся авторизоваться в МГУ
    # result может вернуть либо {'access_token': ...}, либо {'access_token': ..., 'mrsu_user_data': ...}
    result = await mrsu_service.authenticate(credentials.username, credentials.password)
    
    # 2. Шифруем пароль (теперь это не упадет благодаря прошлому фиксу)
    encrypted_pwd = encrypt_password(credentials.password)
    
    # 3. Обновляем данные пользователя в нашей базе
    current_user.mrsu_username = credentials.username
    current_user.mrsu_password_encrypted = encrypted_pwd
    current_user.is_mrsu_verified = True
    
    db.commit()
    db.refresh(current_user)
    
    # 4. Формируем безопасный ответ для фронтенда
    # Используем .get(), чтобы не вылетало KeyError, если ключа нет
    return {
        "status": "success",
        "message": "Аккаунт ЭИОС успешно привязан",
        "user_info": result.get('mrsu_user_data', {"note": "Данные профиля будут загружены позже"})
    }