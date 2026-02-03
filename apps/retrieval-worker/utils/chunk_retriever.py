import asyncio
import re

from lib.llm_client import remote_embedder
from schemas import BaseChunk
from utils.db_client import get_db


async def retrieve_keyword_chunks(
    notebook_id: str, keywords: list[str]
) -> list[BaseChunk]:
    db = get_db()
    clean_keys = list({k.strip() for k in keywords if k.strip()})

    if not clean_keys:
        return []

    # 2. Build the "Filter" Regex (Fast Index Scan)
    # Finds chunks containing AT LEAST one keyword
    # Pattern: "key1|key2|key3"
    filter_pattern = f"({'|'.join([re.escape(k) for k in clean_keys])})"

    # 3. Build the "Scoring" SQL Dynamically
    # We create a summation string: "(content ~* $3)::int + (content ~* $4)::int ..."
    # This checks each keyword independently.
    # (bool)::int casts True to 1 and False to 0.
    score_parts = []
    query_params = [notebook_id, filter_pattern]

    for i, key in enumerate(clean_keys):
        param_index = i + 3
        score_parts.append(f"(dc.content ~* ${param_index})::int")
        query_params.append(key)

    score_clause = " + ".join(score_parts)

    sql = f"""
        SELECT
            dc.id,
            dc.content,
            dc."parentIds"
        FROM "DocumentChunk" dc
        JOIN "Source" s ON dc."sourceId" = s.id
        WHERE s."notebookId" = $1
          AND dc.content ~* $2
        ORDER BY ({score_clause}) DESC
        LIMIT 20;
    """

    chunks_raw = await db.query_raw(sql, *query_params)

    return [BaseChunk.model_validate(chunk) for chunk in chunks_raw]


async def retrive_vector_chunks(
    notebook_id: str, embeddings: list[float]
) -> list[BaseChunk]:
    db = get_db()
    vector_chunks_raw = await db.query_raw(
        """
        SELECT
            dc.id,
            dc.content,
            dc."parentIds"
        FROM "DocumentChunk" dc
        JOIN "Source" s ON dc."sourceId" = s.id
        WHERE s."notebookId" = $1
        ORDER BY dc.embedding <=> $2::vector ASC
        LIMIT 20;
        """,
        notebook_id,
        embeddings,
    )

    return [BaseChunk.model_validate(chunk) for chunk in vector_chunks_raw]


async def retrieve_chunks(
    notebook_id: str, optimized_query: str, keywords: list[str]
) -> list[BaseChunk]:
    embeddings = await remote_embedder.generate_embeddings.aio(optimized_query)

    vector_chunks, keyword_chunks = await asyncio.gather(
        retrive_vector_chunks(notebook_id, embeddings),
        retrieve_keyword_chunks(notebook_id, keywords),
    )

    unique_map = {}

    for chunk in vector_chunks:
        unique_map[chunk.id] = chunk

    for chunk in keyword_chunks:
        unique_map[chunk.id] = chunk

    return list(unique_map.values())
