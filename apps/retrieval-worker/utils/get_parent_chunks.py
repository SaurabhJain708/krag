import asyncio
import re

from schemas import OptimizedQuery, ParentChunk
from utils.db_client import get_db


async def get_parent_chunks(
    query_state: list[OptimizedQuery],
) -> list[OptimizedQuery]:
    db = get_db()

    # Prepare parallel fetches only for queries that actually have parent IDs.
    queries_with_ids: list[OptimizedQuery] = []
    tasks: list[asyncio.Future] = []

    for query in query_state:
        parent_ids = query.parentIds or []
        if not parent_ids:
            # Ensure parentChunks is always defined, even if empty.
            query.parentChunks = []
            continue

        queries_with_ids.append(query)
        tasks.append(
            db.parentchunk.find_many(
                where={"id": {"in": parent_ids}},
            )
        )

    if tasks:
        results = await asyncio.gather(*tasks)

        for query, parent_chunks_raw in zip(queries_with_ids, results, strict=True):
            query.parentChunks = [
                ParentChunk(
                    id=chunk.id,
                    content=chunk.content,
                    cleanContent=re.sub(r"<<</?\d+>>>", "", chunk.content),
                    sourceId=chunk.sourceId,
                )
                for chunk in parent_chunks_raw
            ]

    return query_state
