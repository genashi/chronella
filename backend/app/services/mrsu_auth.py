import httpx
from fastapi import HTTPException, status
import logging

# Настраиваем простой логгер, чтобы видеть ошибки в консоли
logger = logging.getLogger(__name__)

class MRSUAuthService:
    # КОНСТАНТЫ (URL-адреса)
    # Важно: Токены получаем на p.mrsu.ru
    AUTH_URL = "https://p.mrsu.ru/OAuth/Token"
    # Важно: Данные берем с papi.mrsu.ru
    API_BASE_URL = "https://papi.mrsu.ru/v1"

    async def authenticate(self, username, password):
        """
        1. Получает токен доступа по логину и паролю.
        2. Проверяет токен, запрашивая данные пользователя.
        """
        
        # --- ШАГ 1: Получение токена ---
        # Формируем данные как для обычной HTML формы (не JSON!)
        payload = {
            "grant_type": "password",
            "username": username,
            "password": password,
            "client_id": 8,
            "client_secret": "qweasd",
        }

        # Используем httpx.AsyncClient для асинхронных запросов
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                logger.info(f"Attempting login to MRSU for user: {username}")
                
                response = await client.post(
                    self.AUTH_URL,
                    data=payload,  # ВАЖНО: используем data=, а не json=
                    headers={
                        "Content-Type": "application/x-www-form-urlencoded",
                        "User-Agent": "Chronella-App/1.0" # Представляемся прилично
                    }
                )

                # Если вуз вернул 404 тут — значит URL AUTH_URL неверен
                if response.status_code == 404:
                    logger.error(f"MRSU Auth Endpoint not found: {self.AUTH_URL}")
                    raise HTTPException(
                        status_code=502, 
                        detail="Ошибка подключения к серверу МГУ (Auth URL 404)"
                    )
                
                # Если пароль неверный, API обычно возвращает 400
                if response.status_code != 200:
                    logger.error(f"MRSU Auth failed: {response.text}")
                    raise HTTPException(
                        status_code=400, 
                        detail="Неверный логин или пароль от ЭИОС"
                    )

                token_data = response.json()
                access_token = token_data.get("access_token")
                
                if not access_token:
                    raise HTTPException(status_code=502, detail="Сервер МГУ не выдал токен")

                # --- ШАГ 2: Проверка токена (получение ФИО) ---
                user_info = await self.get_user_info(access_token)
                
                return {
                    "access_token": access_token,
                    "mrsu_user_data": user_info
                }

            except httpx.RequestError as e:
                logger.error(f"Connection error: {e}")
                raise HTTPException(status_code=503, detail="Сервер МГУ недоступен")

    async def get_user_info(self, token: str):
        """Получает информацию о пользователе (ФИО, группа)"""
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.get(
                    f"{self.API_BASE_URL}/User",
                    headers={
                        "Authorization": f"Bearer {token}",
                        "User-Agent": "Chronella-App/1.0"
                    }
                )

                if response.status_code == 404:
                    # А вот тут 404 значит, что мы стучимся не на тот API эндпоинт
                    logger.error(f"MRSU API User Endpoint not found: {self.API_BASE_URL}/User")
                    raise HTTPException(status_code=502, detail="API МГУ изменилось (404 на /User)")
                
                if response.status_code != 200:
                    raise HTTPException(status_code=401, detail="Токен ЭИОС недействителен")

                return response.json()

            except httpx.RequestError:
                 raise HTTPException(status_code=503, detail="Не удалось загрузить профиль студента")

# Создаем экземпляр сервиса
mrsu_service = MRSUAuthService()