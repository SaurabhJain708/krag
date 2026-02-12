from generated.db.enums import Encryption
from utils.db_client import get_db
from utils.encryption import encrypt_data


async def save_to_db(
    assistant_message_id: str,
    content: str,
    encryption_type: str,
    encryption_key: str | None,
    failed: bool = False,
) -> None:
    db = get_db()
    if encryption_type != Encryption.NotEncrypted:
        if not encryption_key:
            raise ValueError("encryption_key is required when encryption is enabled")
        content = encrypt_data(content, encryption_key)

    await db.message.update(
        where={"id": assistant_message_id},
        data={"content": content, "failed": failed},
    )

    return
