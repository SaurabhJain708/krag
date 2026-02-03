import json

from lib.llm_client import remote_llm
from schemas.query_optimizer import QueryOptimizer

json_schema_str = json.dumps(QueryOptimizer.model_json_schema())


# 2. The Prompt (Strict Qwen ChatML format)
def build_prompt(user_input: str) -> str:
    return f"""<|im_start|>system
You are a RAG query optimizer. Your job is to rewrite the user's raw input into a search-optimized format.
1. enhanced_question: Remove fluff, resolve pronouns, and make it standalone.
2. keywords: Extract technical nouns for keyword search.<|im_end|>
<|im_start|>user
{user_input}<|im_end|>
<|im_start|>assistant
"""


async def prepare_question(content: str) -> QueryOptimizer:
    response_text = await remote_llm.generate.remote.aio(
        prompt=build_prompt(content),
        max_tokens=512,
        temperature=0.1,
        json_schema=json_schema_str,
    )

    return QueryOptimizer.model_validate_json(response_text)
