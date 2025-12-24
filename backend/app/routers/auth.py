from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from pydantic import BaseModel
import logging
import os
from google_auth_oauthlib.flow import Flow

from .. import schemas, crud, models
from ..database import get_db
from ..auth_utils import verify_password, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES, get_current_user
from ..core.security import encrypt_password
from ..services.mrsu_auth import mrsu_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/register", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    try:
        db_user = crud.get_user_by_email(db, email=user.email)
        if db_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        if not user.password or len(user.password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 6 characters long"
            )
        new_user = crud.create_user(db=db, user=user)
        return new_user
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating user: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating user: {str(e)}"
        )
@router.get("/profile")
async def get_profile(current_user: models.User = Depends(get_current_user)):

    return {"id": current_user.id, "email": current_user.email}

@router.post("/login", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, email=form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/auth/link-mrsu", response_model=schemas.UserOut)
async def link_mrsu_account_new(
    data: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Привязка аккаунта MRSU по username и password (POST /users/link-mrsu).
    Проверяет валидность пароля через mrsu_service.authenticate,
    если ок — шифрует пароль, обновляет пользователя, возвращает обновлённого пользователя.
    """
    username = data.get("username")
    password = data.get("password")
    if not username or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing username or password"
        )
    try:
        # Аутентификация через MRSU API
        auth_result = await mrsu_service.authenticate(username, password)
        if not auth_result or not auth_result.get("access_token"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="MRSU authentication failed: invalid username or password"
            )
    except HTTPException:
        # Пробрасываем HTTPException дальше
        raise
    except Exception as e:
        logger.error(f"MRSU authentication failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"MRSU authentication failed: {str(e)}"
        )
    try:
        encrypted_pass = encrypt_password(password)
        current_user.mrsu_username = username
        current_user.mrsu_password_encrypted = encrypted_pass
        current_user.is_mrsu_verified = True
        db.add(current_user)
        db.commit()
        db.refresh(current_user)
        return current_user
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to save MRSU account: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to link MRSU account: {str(e)}"
        )

@router.post("/google/callback")
async def google_oauth_callback(
    data: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    auth_code = data.get("auth_code") or data.get("code")
    if not auth_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing auth_code or code"
        )
    google_client_id = os.getenv("GOOGLE_CLIENT_ID")
    google_client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    google_redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:5173/auth/google/callback")
    if not google_client_id or not google_client_secret:
        logger.error("Google OAuth credentials not configured")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables."
        )
    try:
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": google_client_id,
                    "client_secret": google_client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [google_redirect_uri]
                }
            },
            scopes=[
                "https://www.googleapis.com/auth/calendar",
                "https://www.googleapis.com/auth/userinfo.email",
                "https://www.googleapis.com/auth/userinfo.profile"
            ]
        )
        flow.redirect_uri = google_redirect_uri
        flow.fetch_token(code=auth_code)
        credentials = flow.credentials
        refresh_token = credentials.refresh_token
        if not refresh_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to obtain refresh token from Google"
            )
        current_user.google_refresh_token = refresh_token
        current_user.is_google_verified = True
        db.add(current_user)
        db.commit()
        db.refresh(current_user)
        logger.info(f"Google OAuth successfully linked for user {current_user.email}")
        return {
            "success": True,
            "google_verified": True,
            "message": "Google account successfully linked"
        }
    except Exception as e:
        logger.error(f"Error during Google OAuth callback: {str(e)}", exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to link Google account: {str(e)}"
        )

