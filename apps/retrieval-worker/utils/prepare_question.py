import json

from lib.llm_client import remote_llm
from schemas.query_optimizer import QueryOptimizer

json_schema_str = json.dumps(QueryOptimizer.model_json_schema())


# 2. The Prompt (Strict Qwen ChatML format)
def build_prompt(user_input: str) -> str:
    return f"""<|im_start|>system
You are a RAG query optimizer. Your task is to transform the user's question into a search-optimized format.

CRITICAL REQUIREMENTS:
1. You MUST output valid JSON only. No markdown, no code blocks, no explanations.
2. **NEVER use backslashes (\\) in your response.** Do NOT use escape sequences (\\, \\\\, etc.) in strings. Use plain text only.
3. Do NOT include citations, references, or special formatting in the output.
4. Follow the exact JSON schema provided.

OUTPUT FORMAT:
- optimized_query: A concise, standalone question (maximum 2-3 sentences, ideally 1 sentence). Remove all pronouns, resolve context, make it specific and searchable. Keep it SHORT and focused. Do NOT include citations like [1] or references. Do NOT repeat the original question verbatim.
- keywords: An array of exactly 3-5 unique technical terms, nouns, or key phrases extracted from the question. Each keyword should be a single word or short phrase (2-3 words max).

EXAMPLES:
Input: "What did the paper say about attention mechanisms?"
Output: {{"optimized_query": "What do attention mechanisms do in neural networks?", "keywords": ["attention", "mechanisms", "neural networks"]}}

Input: "Tell me about the results from table 2"
Output: {{"optimized_query": "What are the experimental results and performance metrics?", "keywords": ["results", "experiments", "performance", "metrics"]}}

REMEMBER:
- Output ONLY valid JSON
- No escape characters
- No citations or references
- Keep it simple and clean<|im_end|>
<|im_start|>user
{user_input}<|im_end|>
<|im_start|>assistant
"""


async def prepare_question(content: str) -> QueryOptimizer:
    response_text = await remote_llm.generate.remote.aio(
        prompt=build_prompt(content),
        max_tokens=8192,
        temperature=0.5,
        json_schema=json_schema_str,
    )

    return QueryOptimizer.model_validate_json(response_text)
