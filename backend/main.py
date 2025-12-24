# backend/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware # Для связи React и FastAPI

# !!! НОВЫЕ ИМПОРТЫ !!!
from app import models
from app.database import engine, Base
from app.routers import auth, users, google_auth

from dotenv import load_dotenv
import os

# Создаем все таблицы, которые наследуются от Base, в базе данных
# Это создает файл database.db, если он еще не существует.
Base.metadata.create_all(bind=engine)

load_dotenv()
print(f"DEBUG: Client ID is {os.getenv('GOOGLE_CLIENT_ID')}")

# Создаем экземпляр приложения FastAPI
app = FastAPI(
    title="Chronella API",
    description="API для анализа успеваемости и планирования активности.",
    version="0.1.0"
)

# Настраиваем CORS
# Это важно, чтобы React (работающий на порту 5173 или 3000) мог общаться с FastAPI (на порту 8000).
origins = [
    "http://localhost",
    "http://localhost:3000",  # Порт для некоторых React приложений
    "http://localhost:5173",  # Порт по умолчанию для Vite
    "http://127.0.0.1:5173",  # Альтернативный адрес для Vite
    "http://127.0.0.1:3000",  # Альтернативный адрес
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

# Подключаем роутеры
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(google_auth.router)

# Документация: FastAPI автоматически создает интерактивную документацию
# Ее можно будет посмотреть по адресу: http://127.0.0.1:8000/docs



