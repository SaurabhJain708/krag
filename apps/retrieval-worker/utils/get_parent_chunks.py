from types import ParentChunk

from utils.db_client import get_db


async def get_parent_chunks(parent_ids: list[str]) -> list[ParentChunk]:
    db = get_db()
    parent_chunks_raw = await db.parentchunk.find_many(where={"id": {"in": parent_ids}})
    return [ParentChunk.model_validate(chunk) for chunk in parent_chunks_raw]
