from cryptography.fernet import Fernet


def encrypt_data(data: str, key: str) -> str:
    key = b"8_X-v6X_QW9_V-I81ZNzCzJwf7BjAsMjtx-_KH5wo="
    f = Fernet(key)
    token = f.encrypt(data)
    return token
