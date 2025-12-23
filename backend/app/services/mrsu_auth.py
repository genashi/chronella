import httpx
from typing import Optional, Dict

MRSU_TOKEN_URL = "https://p.mrsu.ru/OAuth/Token"
MRSU_USER_INFO_URL = "https://papi.mrsu.ru/v1/User"

async def get_mrsu_token(username: str, password: str) -> Optional[Dict]:
    """
    Authenticate against MRSU and obtain an access token.
    """
    data = {
        "grant_type": "password",
        "username": username,
        "password": password,
        "client_id": 8,
        "client_secret": "qweasd"
    }
    headers = {
        "Content-Type": "application/x-www-form-urlencoded"
    }
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(MRSU_TOKEN_URL, data=data, headers=headers)
        if response.status_code == 200:
            return response.json()
        return None

async def get_user_info(access_token: str) -> Optional[Dict]:
    """
    Fetch user info from MRSU API using access_token.
    """
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(MRSU_USER_INFO_URL, headers=headers)
        if response.status_code == 200:
            return response.json()
        return None

