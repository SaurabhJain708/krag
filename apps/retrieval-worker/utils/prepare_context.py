from generated.db.fields import Json
from lib.llm_client import remote_llm
from schemas.context import Context, MessageDict
from utils.db_client import get_db
from utils.tokenizer_config import TOKEN_LIMIT
from utils.tools import count_tokens


def build_summary_prompt(current_summary: str, new_messages: list[MessageDict]) -> str:
    """
    Constructs a concise prompt for Qwen 2.5 to merge new messages into an existing summary.
    """

    formatted_messages = "\n".join(
        [f"{m['role'].upper()}: {m['content']}" for m in new_messages]
    )

    prev_context = current_summary if current_summary else "No prior summary."

    prompt = f"""
        ### EXISTING SUMMARY
        {prev_context}

        ### NEW MESSAGES
        {formatted_messages}

        ### INSTRUCTION
        Update the 'Existing Summary' by incorporating the key information from the 'New Messages'.
        - Maintain chronological order of events.
        - Focus on technical details, decisions, and user goals.
        - Remove filler conversation (greetings, small talk).
        - Return ONLY the updated summary text.
        - The summary should be no more than 20000 characters.
        """.strip()

    return prompt


def extract_existing_context(
    user_query: str, final_response: str, existing_context_data: dict | None
) -> tuple[Context, list[MessageDict]]:
    """
    Logic to merge new messages, check limits, and split for summarization.
    """

    if existing_context_data:
        context = Context(**existing_context_data)
    else:
        context = Context(summary="", messages=[])

    # 2. Append New Messages (Formatted as Dicts)
    context.messages.append({"role": "user", "content": user_query})
    context.messages.append({"role": "assistant", "content": final_response})

    current_tokens = 0
    split_index = 0

    # Iterate backwards (Newest -> Oldest)
    # range(start, stop, step) -> len-1 down to 0
    for i in range(len(context.messages) - 1, -1, -1):
        msg = context.messages[i]

        # Count tokens for this specific message
        # (We wrap in list because apply_chat_template expects a list)
        msg_cost = count_tokens([msg])

        if current_tokens + msg_cost > TOKEN_LIMIT:
            # If adding this message breaks the limit, we stop.
            # The split is at i + 1 (The message *after* this one is the first one we keep)
            split_index = i + 1
            break

        current_tokens += msg_cost

    messages_to_summarise = context.messages[:split_index]
    context.messages = context.messages[split_index:]

    return context, messages_to_summarise


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

    context, messages_to_summarise = extract_existing_context(
        user_query, final_response, existing_data
    )

    # Only update summary if there are messages to summarize
    if messages_to_summarise:
        summary = await remote_llm.generate.remote.aio(
            prompt=build_summary_prompt(context.summary, messages_to_summarise),
            max_tokens=8096,
            temperature=0.7,
        )
        context.summary = summary

    print(f"Updating context for notebook: {notebook_id}")
    print(f"Context: {context.model_dump()}")

    # Prisma Python requires JSON fields to be wrapped in Json type
    await db.notebook.update(
        where={"id": notebook_id},
        data={"context": Json(context.model_dump())},
    )

    return
