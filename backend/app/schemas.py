from pydantic import BaseModel, EmailStr

# 1. Схема для создания нового пользователя (то, что мы ожидаем от клиента)
class UserCreate(BaseModel):
    email: EmailStr
    password: str

# 2. Схема для чтения пользователя (то, что мы возвращаем клиенту)
class UserOut(BaseModel):
    id: int
    email: EmailStr
    is_active: bool
    student_id: str | None = None
    
    class Config:
        from_attributes = True

# 3. Схема для JWT токена
class Token(BaseModel):
    access_token: str
    token_type: str

# 4. Схема для данных токена
class TokenData(BaseModel):
    email: str | None = None

