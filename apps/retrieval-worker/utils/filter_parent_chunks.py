import asyncio
from collections import defaultdict

from lib.llm_client import remote_filter
from schemas.chunks import ParentChunk
from schemas.filtered_chunks import FilteredParentChunk, FilteredQueryResult
from schemas.query_optimizer import OptimizedQuery


async def filter_parent_chunks(
    optimized_queries: list[OptimizedQuery],
) -> list[FilteredQueryResult]:
    # Group parent chunks by optimized query string
    clean_parent_chunks: dict[str, list[dict[str, str]]] = defaultdict(list)
    query_to_optimized_query: dict[str, OptimizedQuery] = {}

    for optimized_query in optimized_queries:
        query_str = optimized_query.optimized_query
        query_to_optimized_query[query_str] = optimized_query

        for parent_chunk in optimized_query.parentChunks:
            clean_parent_chunks[query_str].append(
                {"content": parent_chunk.content, "id": parent_chunk.id}
            )

    # Create async tasks for reranking
    rerank_tasks: list[asyncio.Future] = []
    query_strings: list[str] = []

    for query_str, documents in clean_parent_chunks.items():
        query_strings.append(query_str)
        # rerank handles empty lists gracefully (returns [])
        rerank_tasks.append(remote_filter.rerank.remote.aio(query_str, documents))

    # Wait for all rerank operations to complete
    filtered_parent_chunks_results = await asyncio.gather(*rerank_tasks)

    # Build result list matching the dummy.json format
    results: list[FilteredQueryResult] = []

    for query_str, filtered_result in zip(
        query_strings, filtered_parent_chunks_results, strict=True
    ):
        optimized_query = query_to_optimized_query[query_str]

        # Create a mapping from chunk ID to the original chunk for O(1) lookup
        chunk_id_to_chunk: dict[str, ParentChunk] = {
            chunk.id: chunk for chunk in optimized_query.parentChunks
        }

        # Build filtered parent chunks with content and sourceId from original chunks
        filtered_chunks: list[FilteredParentChunk] = []
        for filtered_chunk in filtered_result:
            chunk_id = filtered_chunk["id"]
            original_chunk = chunk_id_to_chunk.get(chunk_id)
            if original_chunk:
                filtered_chunks.append(
                    FilteredParentChunk(
                        content=original_chunk.content,
                        sourceId=original_chunk.sourceId,
                    )
                )

        results.append(
            FilteredQueryResult(
                optimized_query=query_str,
                parent_chunks=filtered_chunks,
            )
        )

    return results
