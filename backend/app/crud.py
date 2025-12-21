from sqlalchemy.orm import Session
from . import models, schemas
from .auth_utils import get_password_hash

# --- Функции CRUD для пользователя ---

def get_user_by_email(db: Session, email: str):
    # Поиск пользователя по email
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    try:
        # 1. Хешируем пароль
        hashed_password = get_password_hash(user.password)
        
        # 2. Создаем экземпляр модели User
        db_user = models.User(
            email=user.email, 
            hashed_password=hashed_password
        )
        
        # 3. Добавляем в сессию, фиксируем (commit) и обновляем объект
        db.add(db_user)
        db.commit()
        db.refresh(db_user) # Обновляем объект, чтобы получить ID из базы данных
        
        return db_user
    except Exception as e:
        # Откатываем транзакцию в случае ошибки
        db.rollback()
        raise

