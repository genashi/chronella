from pydantic import BaseModel, EmailStr

# 1. Схема для создания нового пользователя (то, что мы ожидаем от клиента)
class UserCreate(BaseModel):
    # EmailStr гарантирует, что это похоже на настоящий email
    email: EmailStr
    password: str
    
    # Можно добавить проверку на длину пароля или совпадение
    # password и confirm_password, но пока оставим базовый вариант.

# 2. Схема для чтения пользователя (то, что мы возвращаем клиенту)
class UserOut(BaseModel):
    # Мы НИКОГДА не возвращаем пароль (даже хешированный)
    id: int
    email: EmailStr
    is_active: bool
    student_id: str | None = None # str | None - это подсказка типа (Type Hint) для Python 3.10+
    
    # Класс Config говорит Pydantic, что он должен работать
    # с объектами ORM (нашей моделью User)
    class Config:
        from_attributes = True # Раньше было orm_mode = True