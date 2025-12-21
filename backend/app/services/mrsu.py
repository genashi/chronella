import httpx

class MrsuAPIService:
    BASE_URL = "https://papi.mrsu.ru/v1"

    @staticmethod
    async def login(username: str, password: str) -> str:
        url = f"{MrsuAPIService.BASE_URL}/Account/Login"
        data = {
            "username": username,
            "password": password
        }
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.post(url, json=data)
                response.raise_for_status()
                resp_json = response.json()
                # Ожидается, что токен вернётся в ответе с ключом "token"
                token = resp_json.get("token")
                if not token:
                    raise Exception("Token is missing in the login response")
                return token
        except httpx.HTTPStatusError as e:
            # Например, неправильный логин/пароль – покажем человеческую ошибку
            raise Exception(f"Login failed: {e.response.status_code} {e.response.text}")
        except httpx.RequestError:
            # API не доступно или таймаут
            raise Exception("Unable to connect to MRSU API. Please try again later.")
        except Exception as e:
            raise Exception(f"Unexpected error during login: {str(e)}")

    @staticmethod
    async def check_token(token: str) -> bool:
        url = f"{MrsuAPIService.BASE_URL}/Account/WhoAmI"
        headers = {
            "Authorization": f"Bearer {token}"
        }
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(url, headers=headers)
                # 401 – невалидный/протухший токен
                if response.status_code == 200:
                    return True
                elif response.status_code == 401:
                    return False
                else:
                    # Что-то не так с API или с токеном, например 5xx ошибка
                    response.raise_for_status()
        except httpx.RequestError:
            raise Exception("Unable to connect to MRSU API. Please try again later.")
        except Exception as e:
            raise Exception(f"Unexpected error during token validation: {str(e)}")

