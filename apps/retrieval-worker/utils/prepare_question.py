import json

from lib.llm_client import remote_llm
from schemas.query_optimizer import QueryOptimizer
from utils.db_client import get_db

json_schema_str = json.dumps(QueryOptimizer.model_json_schema())


def build_query_optimizer_prompt(user_input: str, context_str: str) -> str:
    """
    Builds a minimized prompt for Qwen 2.5 to generate search queries.
    """
    # defaults for empty context
    ctx = context_str if context_str else "No prior context."

    return f"""<|im_start|>system
    You are a search optimizer. Convert the User Input into a standalone, specific search query based on the Context. Resolve pronouns and references.

    Output strictly raw JSON (no markdown, no backslashes) following this schema:
    {{
    "optimized_query": "concise_contextual_question",
    "keywords": ["technical_term1", "term2", "term3"]
    }}
    <|im_end|>
    <|im_start|>user
    Context: {ctx}
    Input: {user_input}
    <|im_end|>
    <|im_start|>assistant
    """


async def prepare_question(content: str, notebook_id: str) -> QueryOptimizer:
    db = get_db()
    record = await db.notebook.find_unique(where={"id": notebook_id})
    context = record.context if (record and record.context) else None
    response_text = await remote_llm.generate.remote.aio(
        prompt=build_query_optimizer_prompt(content, context),
        max_tokens=8192,
        temperature=0.5,
        json_schema=json_schema_str,
    )

    return QueryOptimizer.model_validate_json(response_text)
