from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from google_auth_oauthlib.flow import Flow
import os

from ..database import get_db
from ..auth_utils import get_current_user
from ..models import User

router = APIRouter(prefix="/auth/google", tags=["Google"])

SCOPES = [
    "https://www.googleapis.com/auth/calendar",
]

def get_flow():
    """Создаём Flow каждый раз заново — env точно загружен к этому моменту."""
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")

    if not client_id or not client_secret or not redirect_uri:
        raise HTTPException(status_code=500, detail="Google credentials not configured")

    return Flow.from_client_config(
        {
            "web": {
                "client_id": client_id,
                "client_secret": client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=SCOPES,
        redirect_uri=redirect_uri
    )


@router.get("/url")
async def get_google_auth_url():
    flow = get_flow()
    auth_url, _ = flow.authorization_url(access_type="offline", prompt="consent")
    return {"url": auth_url}


@router.post("/callback")
async def google_auth_callback(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    body = await request.json()
    code = body.get("code")
    if not code:
        raise HTTPException(status_code=400, detail="Code is required")

    flow = get_flow()  # ← используем get_flow() вместо CLIENT_CONFIG
    flow.fetch_token(code=code)
    credentials = flow.credentials

    refresh_token = credentials.refresh_token
    if not refresh_token:
        raise HTTPException(
            status_code=400,
            detail="Refresh token not received. Revoke app access in Google account and try again."
        )

    current_user.google_refresh_token = refresh_token
    current_user.is_google_verified = True
    db.commit()
    db.refresh(current_user)

    return {"status": "success", "message": "Google Calendar connected"}

@router.get("/check")
async def check_google_status(current_user: User = Depends(get_current_user)):
    # Простая проверка: если токен пустой, значит привязки нет
    is_linked = bool(current_user.google_refresh_token)
    return {"is_linked": is_linked}

@router.post("/disconnect")
async def google_disconnect(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Зануляем токены и статус привязки
    current_user.google_refresh_token = None
    current_user.is_google_verified = False
    current_user.google_calendar_id = None  # Если сохранял ID календаря Хронеллы
    
    db.commit()
    db.refresh(current_user)
    return {"status": "success", "message": "Google Calendar успешно отключен"}