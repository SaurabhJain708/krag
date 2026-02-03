from db_client import get_db


async def save_to_db(assistant_message_id: str, content: str) -> None:
    db = get_db()

    await db.message.update(
        where={"id": assistant_message_id},
        data={"content": content},
    )

    return
