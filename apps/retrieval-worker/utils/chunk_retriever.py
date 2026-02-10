import asyncio
import re

from lib.llm_client import remote_embedder
from schemas.query_optimizer import OptimizedQuery
from utils.db_client import get_db


async def retrieve_keyword_chunks(
    notebook_id: str, keywords: list[str], limit: int = 20
) -> list[str]:
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
            dc."parentIds"
        FROM "DocumentChunk" dc
        JOIN "Source" s ON dc."sourceId" = s.id
        WHERE s."notebookId" = $1
          AND dc.content ~* $2
        ORDER BY ({score_clause}) DESC
        LIMIT {limit};
    """

    chunks_raw = await db.query_raw(sql, *query_params)

    # Collect unique parent IDs from all matching chunks.
    parent_ids: set[str] = set()
    for row in chunks_raw:
        # Each row is expected to have a "parentIds" array column.
        for pid in row.get("parentIds") or []:
            parent_ids.add(pid)

    return list(parent_ids)


async def retrive_vector_chunks(
    notebook_id: str, embeddings: list[float], limit: int = 20
) -> list[str]:
    db = get_db()
    vector_chunks_raw = await db.query_raw(
        """
        SELECT
            dc."parentIds"
        FROM "DocumentChunk" dc
        JOIN "Source" s ON dc."sourceId" = s.id
        WHERE s."notebookId" = $1
        ORDER BY dc.embedding <=> $2::vector ASC
        LIMIT $3;
        """,
        notebook_id,
        embeddings,
        limit,
    )

    parent_ids: set[str] = set()
    for row in vector_chunks_raw:
        for pid in row.get("parentIds") or []:
            parent_ids.add(pid)

    return list(parent_ids)


async def retrieve_chunks(
    notebook_id: str, optimized_query: list[OptimizedQuery]
) -> list[OptimizedQuery]:

    # Generate embeddings for all optimized queries in parallel to reduce latency.
    embedding_tasks = [
        remote_embedder.generate_embeddings.remote.aio(query.optimized_query)
        for query in optimized_query
    ]
    embeddings_results = await asyncio.gather(*embedding_tasks)
    for query, emb in zip(optimized_query, embeddings_results, strict=True):
        query.embeddings = emb

    limit_per_query = 100 // len(optimized_query)

    # For each optimized query, fetch vector- and keyword-based parent IDs in parallel,
    # and do this concurrently across all queries to minimize latency.
    parent_tasks = [
        asyncio.gather(
            retrive_vector_chunks(notebook_id, query.embeddings or [], limit_per_query),
            retrieve_keyword_chunks(notebook_id, query.keywords, limit_per_query),
        )
        for query in optimized_query
    ]

    parent_results = await asyncio.gather(*parent_tasks)

    for query, (vector_parent_ids, keyword_parent_ids) in zip(
        optimized_query, parent_results, strict=True
    ):
        # Attach the unique set of parent IDs associated with this optimized query.
        query.parentIds = list(set(vector_parent_ids) | set(keyword_parent_ids))

    return optimized_query
