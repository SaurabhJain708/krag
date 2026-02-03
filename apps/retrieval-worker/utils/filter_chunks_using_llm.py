import json

from lib.llm_client import remote_llm
from schemas import BaseChunk, SelectedChunkIds

json_schema_str = json.dumps(SelectedChunkIds.model_json_schema())


def build_selection_prompt(user_query: str, chunks: list[BaseChunk]) -> str:
    chunks_str = ""
    for chunk in chunks:
        chunks_str += f"ID: {chunk.id}\nCONTENT: {chunk.content}\n---\n"

    return f"""<|im_start|>system
        You are a Relevance Filter for a RAG system. Your goal is to select document chunks that might contain the answer or point to the answer in their surrounding context.

        **Constraint Checklist & Confidence Score:**
        1. Select chunks that are semantically relevant to the user's query.
        2. IMPORTANT: Chunks may be short, fragmented, or cut off. If a chunk looks like it belongs to a relevant section (even if it's incomplete), SELECT IT. Its parent text will be retrieved later.
        3. Ignore chunks that are completely irrelevant (headers, footers, unrelated topics).
        4. Output ONLY a JSON object with a list of "selected_ids".

        **Input Data:**
        User Query: "{user_query}"

        **Candidate Chunks:**
        {chunks_str}
        <|im_end|>
        <|im_start|>user
        Identify the relevant chunk IDs. Return strictly JSON.<|im_end|>
        <|im_start|>assistant
        """


async def filter_chunks_using_llm(
    chunks: list[BaseChunk], optimised_query: str
) -> list[str]:
    prompt = build_selection_prompt(optimised_query, chunks)
    print(prompt)
    response_text = await remote_llm.generate.remote.aio(
        prompt=prompt,
        max_tokens=512,
        temperature=0.1,
        json_schema=json_schema_str,
    )

    selected_chunk_ids = SelectedChunkIds.model_validate_json(response_text)
    selected_ids_set = set(selected_chunk_ids.selected_ids)

    selected_parent_ids = []
    for chunk in chunks:
        if chunk.id in selected_ids_set:
            selected_parent_ids.extend(chunk.parentIds)

    return selected_parent_ids
