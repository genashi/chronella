from cryptography.fernet import Fernet
import os

# Чтобы сгенерировать ключ:
# >>> from cryptography.fernet import Fernet
# >>> key = Fernet.generate_key()
# Скопируйте этот ключ и задайте в переменной окружения ENCRYPTION_KEY

_ENCRYPTION_KEY = os.environ.get("ENCRYPTION_KEY")
if not _ENCRYPTION_KEY:
    raise Exception("ENCRYPTION_KEY environment variable not set")
if isinstance(_ENCRYPTION_KEY, str):
    _ENCRYPTION_KEY = _ENCRYPTION_KEY.encode()

_f = Fernet(_ENCRYPTION_KEY)

def encrypt_password(password: str) -> str:
    """
    Encrypts a password using Fernet symmetric encryption.
    Returns the encrypted token as a string.
    """
    return _f.encrypt(password.encode()).decode()

def decrypt_password(token: str) -> str:
    """
    Decrypts a Fernet-encrypted token and returns the plain password.
    """
    return _f.decrypt(token.encode()).decode()
