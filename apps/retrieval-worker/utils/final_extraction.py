import json

from lib.llm_client import remote_llm
from schemas import ParentChunk, TextWithCitations

json_schema_str = json.dumps(TextWithCitations.model_json_schema())


def build_final_extraction_prompt(
    user_query: str, parent_chunks: list[ParentChunk]
) -> str:
    chunks_str = ""
    for chunk in parent_chunks:
        chunks_str += f"ID: {chunk.id}\nSOURCE_ID: {chunk.sourceId}\nCONTENT: {chunk.content}\n---\n"

    return f"""<|im_start|>system
You are a RAG answer generator that must return a **single valid JSON object** matching the `TextWithCitations` schema.

**Your tasks:**
- Read the chunks below and answer the user's question.
- Write the answer as GitHub markdown in the `text` field.
- Use a **small number** of high‑quality citations (typically 3–10), not hundreds.

**How to use citations:**
- When you use information from a chunk, add a marker like `[CITATION: 1]` in the text.
- In the `citations` array:
  - `citation`: the citation number as a string, e.g. `"1"`.
  - `sourceId`: the `SOURCE_ID` from the chunk.
  - `chunkId`: the `ID` from the chunk.
  - `exact_text`: the exact supporting text from that chunk.
  - `brief_summary`: 1–2 sentence summary of what this citation adds.
- Every object in `citations` **must** correspond to at least one `[CITATION: N]` marker in `text`.

**Chunk format note:**
- Chunks contain markers like `<<</CHUNK_ID>>>content<<</CHUNK_ID>>>`.
- When filling `exact_text`, use only the inner `content` text, not the marker tokens.

**Important constraints:**
- Respond with **only JSON**, no extra commentary.
- The JSON **must be syntactically valid** (proper quotes, commas, and braces).
- Do **not** invent fields outside the `TextWithCitations` schema.

User Query: "{user_query}"

Source Chunks:
{chunks_str}
<|im_end|>
<|im_start|>user
Return a **single valid JSON object** that matches the `TextWithCitations` schema for the answer to the query above. Do not include any extra text before or after the JSON.<|im_end|>
<|im_start|>assistant
"""


async def final_extraction(
    parent_chunks: list[ParentChunk], optimised_query: str
) -> str:
    prompt = build_final_extraction_prompt(optimised_query, parent_chunks)

    response_text = await remote_llm.generate.remote.aio(
        prompt=prompt,
        max_tokens=8000,
        temperature=0.1,
        json_schema=json_schema_str,
    )

    print(response_text)
    return TextWithCitations.model_validate_json(response_text)
