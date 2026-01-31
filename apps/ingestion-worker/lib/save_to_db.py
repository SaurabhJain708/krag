from schemas.index import (
    Child_Chunks,
    Chunk,
    FileProcessingStatus,
    Parent_Chunks,
    images,
)
from utils.db_client import get_db


async def save_to_db(
    child_chunks: list[Child_Chunks],
    parent_chunks: list[Parent_Chunks],
    source_id: str,
    split_content: list[Chunk],
    images: list[images],
    user_id: str,
):
    db = get_db()
    await db.source.update(
        where={"id": source_id},
        data={
            "processingStatus": FileProcessingStatus.completed,
            "content": split_content,
        },
    )
    await db.parent_chunk.create_many(
        data=[
            {
                "id": parent_chunk["id"],
                "content": parent_chunk["content"],
                "source_id": source_id,
            }
            for parent_chunk in parent_chunks
        ]
    )
    await db.documentchunk.create_many(
        data=[
            {
                "content": child_chunk["content"],
                "parent_ids": child_chunk["parent_ids"],
                "embeddings": child_chunk["embeddings"],
            }
            for child_chunk in child_chunks
        ]
    )
