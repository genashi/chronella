# backend/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware # Для связи React и FastAPI

# !!! НОВЫЕ ИМПОРТЫ !!!
from app import models
from app.database import engine

# Создаем все таблицы, которые наследуются от Base, в базе данных
# Это создает файл database.db, если он еще не существует.
models.Base.metadata.create_all(bind=engine)

# Создаем экземпляр приложения FastAPI
app = FastAPI(
    title="Chronella API",
    description="API для анализа успеваемости и планирования активности.",
    version="0.1.0"
)

# Настраиваем CORS
# Это важно, чтобы React (работающий на порту 3000) мог общаться с FastAPI (на порту 8000).
origins = [
    "http://localhost",
    "http://localhost:3000",  # Порт, на котором будет работать React
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Базовый маршрут (эндпоинт) для проверки
@app.get("/")
def read_root():
    return {"message": "Hello from Chronella FastAPI Backend!"}

# Документация: FastAPI автоматически создает интерактивную документацию
# Ее можно будет посмотреть по адресу: http://127.0.0.1:8000/docs



