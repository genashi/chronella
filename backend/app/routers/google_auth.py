from fastapi import APIRouter, Depends, HTTPException, status
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
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/calendar"  # Важно: доступ к календарю
]
REDIRECT_PATH = "/auth/google/callback"
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
REDIRECT_URI = BACKEND_URL + REDIRECT_PATH

router = APIRouter()


def get_flow():
    return Flow.from_client_config(
        {
            "web": {
                "client_id": CLIENT_ID,
                "project_id": "dummy",
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                "client_secret": CLIENT_SECRET,
                "redirect_uris": [REDIRECT_URI],
            }
        },
        scopes=SCOPES,
        redirect_uri=REDIRECT_URI,
    )


@router.get("/auth/google/url")
async def get_google_auth_url():
    """
    Возвращает URL для авторизации Google с правами на календарь, offline-доступом и prompt=consent.
    """
    flow = get_flow()
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        prompt="consent",
        include_granted_scopes="true"
    )
    return {"url": auth_url}


@router.post("/auth/google/callback")
async def google_auth_callback(
    code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Принимает код авторизации от фронта, получает токены, сохраняет refresh_token в модель User.
    """
    if not code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No code provided"
        )

    flow = get_flow()
    try:
        flow.fetch_token(code=code)
        credentials = flow.credentials
        refresh_token = credentials.refresh_token
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to fetch token: {str(e)}"
        )

    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No refresh_token received. Try logging out of your Google account and repeat auth with 'prompt=consent'."
        )

    # Сохраняем refresh_token в профиль пользователя
    current_user.google_refresh_token = refresh_token
    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return JSONResponse({"detail": "Google refresh_token saved successfully"})

