from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
import logging

from .. import schemas, crud, models
from ..database import get_db
from ..auth_utils import verify_password, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES

logger = logging.getLogger(__name__)

# 1. Создание роутера
router = APIRouter(prefix="/auth", tags=["Auth"])

# 2. Роут для регистрации пользователя
@router.post("/register", response_model=schemas.UserOut)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    try:
        # 1. Проверяем, существует ли пользователь с таким email
        db_user = crud.get_user_by_email(db, email=user.email)
        
        if db_user:
            # Если пользователь существует, возвращаем ошибку 400 Bad Request
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # 2. Создаем нового пользователя через функцию CRUD
        new_user = crud.create_user(db=db, user=user)
        return new_user
    except HTTPException:
        # Пробрасываем HTTPException дальше
        raise
    except Exception as e:
        # Логируем ошибку для отладки
        logger.error(f"Error creating user: {str(e)}", exc_info=True)
        # Обрабатываем другие исключения
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating user: {str(e)}"
        )

@router.post("/login", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # 1. Ищем пользователя по email (username в форме = email)
    user = crud.get_user_by_email(db, email=form_data.username)
    
    # 2. Проверяем пароль
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 3. Если все ок, создаем токен
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}