from datetime import datetime, timedelta
from typing import Union
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import bcrypt

from .database import get_db

# КОНФИГУРАЦИЯ (потом вынесем в .env)
SECRET_KEY = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def verify_password(plain_password, hashed_password):
    # bcrypt имеет ограничение в 72 байта для пароля
    # Обрезаем пароль до 72 байт, если он длиннее (для совместимости с хешированием)
    # Используем bcrypt напрямую для консистентности с get_password_hash
    if isinstance(plain_password, str):
        password_bytes = plain_password.encode('utf-8')
    else:
        password_bytes = plain_password
    
    # Обрезаем до 72 байт
    if len(password_bytes) > 72:
        password_bytes = password_bytes[:72]
    
    # Конвертируем хеш в bytes, если он строка
    if isinstance(hashed_password, str):
        hashed_bytes = hashed_password.encode('utf-8')
    else:
        hashed_bytes = hashed_password
    
    # Используем bcrypt напрямую для проверки
    try:
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception:
        # Fallback на passlib для старых хешей, если они есть
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        return pwd_context.verify(password_bytes, hashed_password)

def get_password_hash(password):
    # bcrypt имеет ограничение в 72 байта для пароля
    # Обрезаем пароль до 72 байт, если он длиннее
    # Используем bcrypt напрямую, чтобы избежать проблем с инициализацией passlib
    if isinstance(password, str):
        password_bytes = password.encode('utf-8')
    else:
        password_bytes = password
    
    # Обрезаем до 72 байт
    if len(password_bytes) > 72:
        password_bytes = password_bytes[:72]
    
    # Используем bcrypt напрямую для избежания проблем с passlib
    # Генерируем соль и хешируем пароль
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    
    # Возвращаем как строку для совместимости с passlib форматом
    return hashed.decode('utf-8')

def create_access_token(data: dict, expires_delta: Union[timedelta, None] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# OAuth2 схема для получения токена из заголовка Authorization
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """
    Получает текущего пользователя из JWT токена.
    Используется как зависимость в защищенных эндпоинтах.
    """
    # Импортируем crud здесь, чтобы избежать циклического импорта
    from . import crud
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Декодируем токен
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # Получаем пользователя из базы данных
    user = crud.get_user_by_email(db, email=email)
    if user is None:
        raise credentials_exception
    
    return user

def encrypt_password(password: str) -> str:
    """
    Шифрует пароль. Алиас для get_password_hash для совместимости.
    """
    return get_password_hash(password)

