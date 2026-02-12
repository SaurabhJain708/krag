import base64
import hashlib
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def get_key(password: str) -> bytes:
    """
    Instantly turns any string into a valid 32-byte key using SHA-256.
    """
    return hashlib.sha256(password.encode("utf-8")).digest()


def encrypt_data(data: str, password: str) -> str:
    key = get_key(password)
    iv = os.urandom(12)  # 12 bytes is standard for GCM

    aesgcm = AESGCM(key)
    # Python returns (Ciphertext + Tag) combined
    ciphertext_with_tag = aesgcm.encrypt(iv, data.encode("utf-8"), None)

    # Extract parts to match TypeScript format: IV + Tag + Ciphertext
    tag = ciphertext_with_tag[-16:]
    ciphertext = ciphertext_with_tag[:-16]

    return base64.b64encode(iv + tag + ciphertext).decode("utf-8")


def decrypt_data(token: str, password: str) -> str:
    try:
        data = base64.b64decode(token)

        # 1. Extract parts (Must match TypeScript order)
        iv = data[:12]
        tag = data[12:28]
        ciphertext = data[28:]

        # 2. Re-create key
        key = get_key(password)
        aesgcm = AESGCM(key)

        # 3. Decrypt
        # Python expects (Ciphertext + Tag) as input
        return aesgcm.decrypt(iv, ciphertext + tag, None).decode("utf-8")

    except Exception:
        return "Decryption Failed (Wrong Password or Corrupt Token)"
