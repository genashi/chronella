from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse
import os

from google_auth_oauthlib.flow import Flow
from dotenv import load_dotenv

from sqlalchemy.orm import Session

# Импорт зависимостей вашего проекта для получения БД и текущего пользователя
from ..database import get_db
from ..auth_utils import get_current_user
from ..models import User

# Загрузка переменных окружения
load_dotenv()

CLIENT_ID = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")
GOOGLE_DISCOVERY_URL = "https://accounts.google.com/.well-known/openid-configuration"
SCOPES = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/calendar.readonly"
]
REDIRECT_PATH = "/auth/google/callback"
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
REDIRECT_URI = BACKEND_URL + REDIRECT_PATH

CLIENT_CONFIG = {
    "web": {
        "client_id": os.getenv("GOOGLE_CLIENT_ID"),
        "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
    }
}

SCOPES = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/calendar.readonly"
]

router = APIRouter(prefix="/auth/google", tags=["Google"])

@router.get("/url")
async def get_google_auth_url():
    # Проверяем, что переменные вообще есть
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")

    if not client_id or not client_secret:
        raise HTTPException(status_code=500, detail="Google credentials not configured in .env")

    client_config = {
        "web": {
            "client_id": client_id,
            "client_secret": client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
        }
    }

    flow = Flow.from_client_config(
        client_config,
        scopes=SCOPES,
        redirect_uri=redirect_uri # Убедись, что это передается сюда!
    )
    
    auth_url, _ = flow.authorization_url(access_type='offline', prompt='consent')
    return {"url": auth_url}

@router.post("/callback")
async def google_auth_callback(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Принимает код от фронтенда и сохраняет токены"""
    try:
        body = await request.json()
        code = body.get("code")
        
        if not code:
            raise HTTPException(status_code=400, detail="Code is required")

        flow = Flow.from_client_config(
            CLIENT_CONFIG,
            scopes=SCOPES,
            redirect_uri=os.getenv("GOOGLE_REDIRECT_URI")
        )
        
        # Обмениваем код на токены
        flow.fetch_token(code=code)
        credentials = flow.credentials

        # Сохраняем refresh_token в базу
        # Если refresh_token нет (пользователь уже давал доступ), сохраняем access_token
        current_user.google_refresh_token = credentials.refresh_token or credentials.token
        current_user.is_google_verified = True
        
        db.commit()
        db.refresh(current_user)
        
        return {"status": "success", "message": "Google Calendar подключен!"}
        
    except Exception as e:
        print(f"Error in google callback: {e}")
        raise HTTPException(status_code=400, detail="Ошибка авторизации Google")

