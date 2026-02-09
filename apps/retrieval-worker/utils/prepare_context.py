from generated.db.fields import Json
from schemas.context import Context
from utils.db_client import get_db
from utils.tokenizer_config import TOKEN_LIMIT
from utils.tools import count_tokens_str


def extract_existing_context(
    messages: list[str],
) -> tuple[list[str], list[str], int]:
    """
    Logic to merge new messages, check limits, and split for summarization.
    """

    current_tokens = 0
    split_index = 0

    # Iterate backwards (Newest -> Oldest)
    # range(start, stop, step) -> len-1 down to 0
    for i in range(len(messages) - 1, -1, -1):
        msg = messages[i]

        # Count tokens for this specific message
        # (We wrap in list because apply_chat_template expects a list)
        msg_cost = count_tokens_str(msg)

        if current_tokens + msg_cost > TOKEN_LIMIT:
            # If adding this message breaks the limit, we stop.
            # The split is at i + 1 (The message *after* this one is the first one we keep)
            split_index = i + 1
            break

        current_tokens += msg_cost

    messages_to_summarise = messages[:split_index]
    remaining_messages = messages[split_index:]

    return messages_to_summarise, remaining_messages, split_index


async def prepare_context(
    user_query: str,
    final_response: str,
    notebook_id: str,
    message_id: str,
    user_message_id: str,
):
    """
    Orchestrator function to interact with DB and Context Logic.
    """
    db = get_db()

    record = await db.notebook.find_unique(where={"id": notebook_id})

    existing_data = record.context if (record and record.context) else None

    if existing_data:
        existing_data = Context(**existing_data)
    else:
        existing_data = Context(summaries=[], messages=[])

    # Store original context to compare later
    original_context = existing_data.model_dump()

    existing_data.messages.append(
        {"content": f"USER: {user_query}", "id": user_message_id}
    )
    existing_data.messages.append(
        {"content": f"ASSISTANT: {final_response}", "id": message_id}
    )
    messages = [msg["content"] for msg in existing_data.messages]
    __, _, split_index = extract_existing_context(messages)
    messages_to_summarise = existing_data.messages[:split_index]
    # Remove messages that will be summarized to avoid duplication
    existing_data.messages = existing_data.messages[split_index:]

    # Only update summary if there are messages to summarize
    if messages_to_summarise:
        messageIds = [msg["id"] for msg in messages_to_summarise]
        retrieved_messages = await db.message.find_many(
            where={"id": {"in": messageIds}},
        )
        summaries = [
            f"{msg.role.upper()}: {msg.summary}"
            for msg in retrieved_messages
            if msg.summary  # Only include messages that have summaries
        ]
        existing_data.summaries.extend(summaries)
        _, summaries_that_fit, _ = extract_existing_context(existing_data.summaries)
        existing_data.summaries = summaries_that_fit

    # Only update database if context has changed
    new_context = existing_data.model_dump()
    if new_context != original_context:
        print(f"Updating context for notebook: {notebook_id}")
        print(f"Context: {new_context}")

        # Prisma Python requires JSON fields to be wrapped in Json type
        await db.notebook.update(
            where={"id": notebook_id},
            data={"context": Json(new_context)},
        )
    else:
        print(f"Context unchanged for notebook: {notebook_id}, skipping update")

    return
