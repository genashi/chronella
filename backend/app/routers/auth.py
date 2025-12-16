from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from .. import schemas, crud
from ..database import get_db

# 1. Создание роутера
router = APIRouter(
    prefix="/auth", # Все маршруты будут начинаться с /auth
    tags=["Auth"]   # Группировка в документации
)

# 2. Роут для регистрации пользователя
@router.post("/register", response_model=schemas.UserOut)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # 1. Проверяем, существует ли пользователь с таким email
    db_user = crud.get_user_by_email(db, email=user.email)
    
    if db_user:
        # Если пользователь существует, возвращаем ошибку 400 Bad Request
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # 2. Создаем нового пользователя через функцию CRUD
    return crud.create_user(db=db, user=user)

# ... Здесь будет роут для входа (/login)