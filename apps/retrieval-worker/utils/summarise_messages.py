import asyncio

from generated.db.enums import Encryption
from lib.llm_client import remote_llm
from utils.db_client import get_db
from utils.encryption import encrypt_data
from utils.tools import count_tokens_str


async def summarise_messages(
    user_query: str,
    final_response: str,
    message_id: str,
    user_message_id: str,
    encryption_type: str,
    encryption_key: str | None,
):
    user_message_tokens = count_tokens_str(user_query)
    final_response_tokens = count_tokens_str(final_response)

    user_query_needs_summarisation = user_message_tokens > 100
    final_response_needs_summarisation = final_response_tokens > 400

    if user_query_needs_summarisation:
        user_query = await remote_llm.generate.remote.aio(
            prompt=f"Summarise the following user query to 100 tokens or less: {user_query}",
            max_tokens=100,
            temperature=1.0,
        )
    if final_response_needs_summarisation:
        final_response = await remote_llm.generate.remote.aio(
            prompt=f"Summarise the following final response to 400 tokens or less: {final_response}",
            max_tokens=400,
            temperature=1.0,
        )

    if encryption_type != Encryption.NotEncrypted:
        if not encryption_key:
            raise ValueError("encryption_key is required when encryption is enabled")
        user_query = encrypt_data(user_query, encryption_key)
        final_response = encrypt_data(final_response, encryption_key)

    db = get_db()
    await asyncio.gather(
        db.message.update(
            where={"id": message_id},
            data={"summary": final_response},
        ),
        db.message.update(
            where={"id": user_message_id},
            data={"summary": user_query},
        ),
    )

    return
