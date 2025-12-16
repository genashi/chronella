# backend/app/database.py

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 1. URL для подключения к SQLite
# 'sqlite:///./database.db' означает, что файл базы данных будет создан
# в корне папки 'backend' и будет называться 'database.db'
SQLALCHEMY_DATABASE_URL = "sqlite:///./database.db"

# 2. Создание движка
# connect_args={"check_same_thread": False} нужен только для SQLite,
# чтобы позволить нескольким потокам обращаться к БД (что FastAPI делает)
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# 3. Создание фабрики сессий
# SessionLocal будет использоваться для создания сессии каждый раз, когда мы
# захотим взаимодействовать с БД.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 4. Базовый класс
# declarative_base() — это класс, от которого будут наследоваться все наши модели (таблицы).
Base = declarative_base()

# 5. Функция-зависимость для FastAPI
# Эта функция будет создавать сессию для каждого запроса, а затем закрывать ее.
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()