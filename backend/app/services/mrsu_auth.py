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
        #payload = {
            #"grant_type": "password",
            #"username": username,
           # "password": password,
            #"client_id": 8,
            #"client_secret": "qweasd",
        #}

        # Используем httpx.AsyncClient для асинхронных запросов
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://p.mrsu.ru/OAuth/Token",
                data={
                    "grant_type": "password",
                    "username": username,
                    "password": password,
                    "client_id": 8,  # Замени на реальный
                    "client_secret": "qweasd"  # Замени на реальный
                }
            )
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail=response.json().get("error", "Unknown error"))
            token_data = response.json()
            # Сохрани token_data['access_token'] в DB для current_user
            return {"message": "Linked successfully", "token": token_data['access_token']}

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