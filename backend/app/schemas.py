from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

# --- Auth ---
class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    email: EmailStr
    is_active: bool
    is_mrsu_verified: bool
    is_google_verified: bool

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# --- Events ---
class EventOut(BaseModel):
    id: int
    title: str
    type: str
    start_at: datetime
    end_at: datetime
    location: Optional[str] = None
    teacher: Optional[str] = None
    is_visited: Optional[bool] = None
    is_modified: bool

    class Config:
        from_attributes = True

class EventVisitUpdate(BaseModel):
    is_visited: bool

class EventCreate(BaseModel):
    title: str
    type: str = "custom"
    start_at: datetime
    end_at: datetime
    location: Optional[str] = None
    description: Optional[str] = None

# --- Disciplines ---
class ControlPointOut(BaseModel):
    id: int
    title: str
    type: str
    deadline: Optional[datetime] = None
    score: Optional[float] = None
    max_score: Optional[float] = None
    is_submitted: bool
    is_late: Optional[bool] = None

    class Config:
        from_attributes = True

class DisciplineOut(BaseModel):
    id: int
    name: str
    semester: Optional[str] = None
    control_points: list[ControlPointOut] = []

    class Config:
        from_attributes = True