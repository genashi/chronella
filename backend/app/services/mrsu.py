import httpx

class MRSUService:
    BASE_URL = "https://papi.mrsu.ru/v1"
    TOKEN_URL = "https://p.mrsu.ru/OAuth/Token"
    USER_URL = f"{BASE_URL}/User"

    @staticmethod
    async def authenticate_user(username: str, password: str):
        # 1. Запрос токена
        data = {
            "grant_type": "password",
            "username": username,
            "password": password
        }
        headers = {
            "Content-Type": "application/x-www-form-urlencoded"
        }
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                token_response = await client.post(
                    MRSUService.TOKEN_URL, 
                    data=data,
                    headers=headers
                )
                token_response.raise_for_status()
                token_json = token_response.json()
                access_token = token_json.get("access_token")
                if not access_token:
                    raise Exception("Missing access_token in MRSU response")

                # 2. Запрос данных пользователя с этим токеном
                user_headers = {
                    "Authorization": f"Bearer {access_token}"
                }
                user_response = await client.get(
                    MRSUService.USER_URL, 
                    headers=user_headers
                )
                user_response.raise_for_status()
                user_data = user_response.json()
                return user_data
        except httpx.HTTPStatusError as e:
            error_message = f"Authentication failed: {e.response.status_code} {e.response.text}"
            raise Exception(error_message)
        except httpx.RequestError:
            raise Exception("Unable to connect to MRSU API. Please try again later.")
        except Exception as e:
            raise Exception(f"Unexpected error during authentication: {str(e)}")

