import re

from lib.llm_client import remote_llm
from schemas import (
    FilteredQueryResult,
    FinalisedCitations,
    HowItAnswersList,
)


def build_prompt(
    filtered_query_results: list,
    user_query: str,
    source_id_map: dict[str, str],
) -> str:
    """
    Manually builds the raw prompt string for Phi-4 Mini RAG.
    Returns a single string formatted with <|system|>, <|user|>, and <|assistant|> tokens.
    """

    # 1. Format Context with XML tags
    context_parts = []
    for query_result in filtered_query_results:
        context_parts.append(
            f"<related_query>{query_result.optimized_query}</related_query>"
        )

        for chunk in query_result.parent_chunks:
            # Escape JSON-breaking characters
            safe_content = chunk.content.replace("\\", "\\\\").replace('"', '\\"')

            context_parts.append(
                f'<source id="{source_id_map.get(chunk.sourceId, chunk.sourceId)}">\n'
                f"  <content>{safe_content}</content>\n"
                f"</source>"
            )

    context_str = "\n".join(context_parts)

    # 2. System Prompt
    system_prompt = """You are a precise Knowledge Retrieval Chatbot. Answer using ONLY the provided Source Context.

### RESPONSE FORMAT
Return a SINGLE valid JSON array (no markdown). Each element must match this schema:
[
    {
        "how_it_answers": "A concise explanation of how this specific source helps answer the USER QUERY.",
        "sourceId": "The 'id' attribute from the <source> tag (string, e.g., 'source-1', 'source-2').",
        "chunkId": "The ID found inside <<<...>>> markers in the content (e.g., '123' from '<<<123>>>')"
    }
]

### RULES
1. The top-level response MUST be a JSON array, not an object and not text.
2. Include ONE object for every source that meaningfully contributes to answering the USER QUERY.
3. Use the exact `sourceId` from the <source> tag. These will be short aliases like `source-1`, `source-2`, etc.
4. For `chunkId`, always extract the ID from markers like `<<<123>>>` in that source's content. If multiple chunk IDs appear in the same source, you may:
   - Either pick the single most relevant chunkId, OR
   - Return multiple objects with the same `sourceId` but different `chunkId` values.
5. `how_it_answers` should directly describe how that particular source (and chunk) helps answer the USER QUERY. Be clear and specific.
6. Do NOT include any extra fields beyond `sourceId`, `chunkId`, and `how_it_answers`.
7. Do NOT wrap the JSON in backticks or markdown. Return raw JSON only.

### EXAMPLE
Context:
<source id="source-1">
  <content>The sky is blue <<<99>>> due to Rayleigh scattering.</content>
</source>

USER QUERY: Why is the sky blue?

Output:
[
  {
    "how_it_answers": "Explains that the sky appears blue because of Rayleigh scattering of sunlight in the atmosphere.",
    "sourceId": "source-1",
    "chunkId": "99"
  }
]
"""

    # 3. User Prompt
    user_message_content = f"""
        Answer this query using the context below.

        USER QUERY: {user_query}

        SOURCE CONTEXT:
        {context_str}
        """

    # 4. Manual Token Construction
    final_prompt = (
        f"<|im_start|>system\n{system_prompt}<|im_end|>\n"
        f"<|im_start|>user\n{user_message_content}<|im_end|>\n"
        f"<|im_start|>assistant\n"
    )

    return final_prompt


async def extract_citations(
    filtered_query_results: list[FilteredQueryResult], user_query: str
) -> list[FinalisedCitations]:
    """Extract per-source 'how it answers' explanations from the filtered query results."""
    # Build a stable mapping from real source IDs (UUIDs) to short aliases
    unique_source_ids = list(
        {
            chunk.sourceId
            for query_result in filtered_query_results
            for chunk in query_result.parent_chunks
        }
    )
    real_to_alias: dict[str, str] = {
        source_id: f"source-{idx + 1}"
        for idx, source_id in enumerate(unique_source_ids)
    }
    alias_to_real: dict[str, str] = {
        alias: real for real, alias in real_to_alias.items()
    }

    # Build prompt using alias IDs so it's easier for the LLM
    prompt = build_prompt(filtered_query_results, user_query, real_to_alias)

    # JSON schema for a top-level array of HowItAnswersEntry objects
    schema_str = HowItAnswersList.model_json_schema()

    # Call remote LLM with structured JSON schema (no real_text field in schema)
    result = await remote_llm.generate.remote.aio(
        prompt=prompt,
        max_tokens=5000,
        temperature=0.7,
        json_schema=schema_str,
    )

    # Validate and parse into Pydantic models (as HowItAnswers entries)
    base_entries = HowItAnswersList.model_validate_json(result)

    # Replace alias sourceIds back with the real UUIDs before returning
    for entry in base_entries.root:
        if entry.sourceId in alias_to_real:
            entry.sourceId = alias_to_real[entry.sourceId]

    # Build a map from real sourceId to concatenated parent chunk content
    source_contents: dict[str, str] = {}
    for query_result in filtered_query_results:
        for chunk in query_result.parent_chunks:
            existing = source_contents.get(chunk.sourceId, "")
            source_contents[chunk.sourceId] = f"{existing}{chunk.content}"

    finalised_entries: list[FinalisedCitations] = []

    # For each entry, extract the text between the chunk ID markers for its chunkId
    for entry in base_entries.root:
        if entry.sourceId in source_contents:
            full_text = source_contents[entry.sourceId]

            # Prefer explicit open/close markers: <<<id>>> ... <<</id>>>
            pattern_with_close = rf"<<<{re.escape(entry.chunkId)}>>>(.*?)<<</{re.escape(entry.chunkId)}>>>"
            match = re.search(pattern_with_close, full_text, flags=re.DOTALL)

            if match:
                real_text = match.group(1)
            else:
                # Fallback: from opening marker until the next chunk marker or end of string
                pattern_until_next = (
                    rf"<<<{re.escape(entry.chunkId)}>>>(.*?)(?=<<<\d+>>>|$)"
                )
                match2 = re.search(pattern_until_next, full_text, flags=re.DOTALL)
                real_text = match2.group(1) if match2 else full_text

            finalised_entries.append(
                FinalisedCitations(
                    how_it_answers=entry.how_it_answers,
                    sourceId=entry.sourceId,
                    chunkId=entry.chunkId,
                    real_text=real_text,
                )
            )

    return finalised_entries
