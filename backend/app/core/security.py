from cryptography.fernet import Fernet
import os

# Чтобы сгенерировать ключ:
# >>> from cryptography.fernet import Fernet
# >>> key = Fernet.generate_key()
# Скопируйте этот ключ и задайте в переменной окружения ENCRYPTION_KEY

_f = None

def _get_fernet():
    """
    Ленивая инициализация Fernet. Проверяет ENCRYPTION_KEY только при первом использовании.
    """
    global _f
    if _f is None:
        _ENCRYPTION_KEY = os.environ.get("ENCRYPTION_KEY")
        if not _ENCRYPTION_KEY:
            raise Exception("ENCRYPTION_KEY environment variable not set. Please set it before using encryption functions.")
        if isinstance(_ENCRYPTION_KEY, str):
            _ENCRYPTION_KEY = _ENCRYPTION_KEY.encode()
        _f = Fernet(_ENCRYPTION_KEY)
    return _f

def encrypt_password(password: str) -> str:
    """
    Encrypts a password using Fernet symmetric encryption.
    Returns the encrypted token as a string.
    """
    fernet = _get_fernet()
    return fernet.encrypt(password.encode()).decode()

def decrypt_password(token: str) -> str:
    """
    Decrypts a Fernet-encrypted token and returns the plain password.
    """
    fernet = _get_fernet()
    return fernet.decrypt(token.encode()).decode()
