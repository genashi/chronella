from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from .. import models, database, crud
from ..services.mrsu import MrsuAPIService
from ..auth_utils import get_current_user, encrypt_password

router = APIRouter(
    prefix="/users",
    tags=["Users"],
)

@router.post("/link-mrsu")
async def link_mrsu_account(
    data: dict,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Привязать аккаунт MRSU к текущему пользователю.
    """
    username = data.get("username")
    password = data.get("password")
    if not username or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing username or password"
        )
    try:
        token = await MrsuAPIService.login(username, password)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"MRSU login failed: {str(e)}"
        )
    # login успешен, сохраняем данные в профиль пользователя
    current_user.mrsu_username = username
    current_user.mrsu_password_encrypted = encrypt_password(password)
    current_user.is_mrsu_verified = True
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return {"success": True, "mrsu_verified": True}

