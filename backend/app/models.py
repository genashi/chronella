# backend/app/models.py

from sqlalchemy import Boolean, Column, Integer, String
from .database import Base # Импортируем базовый класс, который мы определили

# Класс User представляет собой таблицу 'users' в базе данных
class User(Base):
    # __tablename__ определяет имя таблицы в базе данных
    __tablename__ = "users"

    # Определение колонок:
    # id - уникальный идентификатор, первичный ключ, автоинкремент
    id = Column(Integer, primary_key=True, index=True)
    
    # email - строка, уникальное поле для входа
    email = Column(String, unique=True, index=True)
    
    # hashed_password - зашифрованный пароль
    hashed_password = Column(String)
    
    # is_active - активен ли пользователь (например, после подтверждения по почте)
    is_active = Column(Boolean, default=True)
    
    # student_id - ID студента в системе вуза (понадобится для API p.mrsu.ru)
    student_id = Column(String, index=True, nullable=True) 

    # Можно добавить метод __repr__ для удобного вывода в консоли
    def __repr__(self):
        return f"<User(email='{self.email}')>"