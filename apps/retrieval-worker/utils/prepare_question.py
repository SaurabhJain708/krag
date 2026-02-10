import json
import uuid

from lib.llm_client import remote_llm
from schemas.query_optimizer import OptimizedQuery, QueryOptimizer
from utils.db_client import get_db

# JSON schema exposed to the LLM (only textual fields via QueryOptimizer/LLMOptimizedQuery).
json_schema_str = json.dumps(QueryOptimizer.model_json_schema())


def build_query_optimizer_prompt(user_input: str, context_str: str) -> str:
    """
    Builds a minimized prompt for Qwen 2.5 to generate search queries.
    """
    # defaults for empty context
    ctx = context_str if context_str else "No prior context."

    return f"""<|im_start|>system
        You are a search query optimizer.

        ### Instructions
        1. **Analyze:** First, think about the User Input and Context. decide if the topics are related or unrelated.
        2. **Refine:** Convert vague questions into specific, technical search queries. Resolve pronouns (it, he, that) using Context.
        3. **Format:** Output valid JSON.

        ### Schema
        {{
        "_reasoning": "Explain why you are splitting or combining the queries.",
        "queries": [
            {{
            "optimized_query": "string",
            "keywords": ["str", "str"]
            }}
        ]
        }}

        ### Examples
        Input: why is it crashing?
        Context: User is debugging a React Native app on Android.
        Output:
        {{
        "_reasoning": "The user refers to 'it' which is the React Native app from context. The issue is a crash on Android. This is a single technical issue.",
        "queries": [
            {{
            "optimized_query": "debug react native crash on android",
            "keywords": ["react native", "android", "crash log"]
            }}
        ]
        }}

        Input: best python framework and chicken recipe
        Context: None
        Output:
        {{
        "_reasoning": "Python frameworks and chicken recipes are completely unrelated domains. Must split into two queries.",
        "queries": [
            {{
            "optimized_query": "best python web frameworks comparison",
            "keywords": ["django", "flask", "fastapi"]
            }},
            {{
            "optimized_query": "best chicken recipes",
            "keywords": ["chicken", "cooking", "recipe"]
            }}
        ]
        }}
        <|im_end|>
        <|im_start|>user
        Context: {ctx}
        Input: {user_input}
        <|im_end|>
        <|im_start|>assistant
    """


async def prepare_question(content: str, notebook_id: str) -> list[OptimizedQuery]:
    """
    Generate optimized search queries for a notebook, then enrich them with local metadata.
    """
    db = get_db()
    record = await db.notebook.find_unique(where={"id": notebook_id})
    context = record.context if (record and record.context) else None

    response_text = await remote_llm.generate.remote.aio(
        prompt=build_query_optimizer_prompt(content, context),
        max_tokens=8192,
        temperature=0.5,
        json_schema=json_schema_str,
    )

    # Parse LLM output according to the LLM-facing schema.
    parsed = QueryOptimizer.model_validate_json(response_text)

    # Convert to internal OptimizedQuery objects and add local-only fields.
    optimized_queries: list[OptimizedQuery] = []
    for q in parsed.queries:
        optimized_queries.append(
            OptimizedQuery(
                optimized_query=q.optimized_query,
                keywords=q.keywords,
                id=str(uuid.uuid4()),
            )
        )

    return optimized_queries[:5]
